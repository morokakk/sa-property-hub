import { StateCreator } from 'zustand';
import {
  DevelopmentProject,
  DevelopmentUnit,
  BOQItem,
  RentalProperty,
  Lease,
  TaskItem,
} from '@/types';
import { RootStoreState, DevelopmentSlice } from '../types';
import { INITIAL_DEVELOPMENTS } from '../initialData';
import { syncDevelopmentApprovalTasks, syncLeaseExpiryTasks } from '../utils/taskSync';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';

export const createDevelopmentSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  DevelopmentSlice
> = (set, get) => ({
  developments: INITIAL_DEVELOPMENTS,

  addDevelopment: (dev) =>
    set((state) => {
      const updatedTasks = syncDevelopmentApprovalTasks(
        state.tasks,
        dev.id,
        dev.title,
        dev.approvals
      );
      return {
        developments: [dev, ...state.developments],
        tasks: updatedTasks,
      };
    }),

  updateDevelopment: (id, updates) =>
    set((state) => {
      const updatedDevelopments = state.developments.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      );
      const target = updatedDevelopments.find((d) => d.id === id);
      const tasks = target
        ? syncDevelopmentApprovalTasks(state.tasks, id, target.title, target.approvals)
        : state.tasks;
      return {
        developments: updatedDevelopments,
        tasks,
      };
    }),

  deleteDevelopment: (id) =>
    set((state) => ({
      developments: state.developments.filter((d) => d.id !== id),
      tasks: state.tasks.filter(
        (t) => !(t.linkedEntity?.id === id && t.id.startsWith('task-dev-approval-'))
      ),
    })),

  sellDevelopmentUnit: (devId, unitId, buyerName, salePriceZAR) =>
    set((state) => {
      const dev = state.developments.find((d) => d.id === devId);
      if (!dev) return state;

      const unit = (dev.units || []).find((u) => u.id === unitId);
      if (!unit) return state;
      // Guard against duplicate sale processing on already sold units (idempotent double-click protection)
      if (unit.status === 'Sold & Transferred' && (!buyerName || unit.buyerName === buyerName)) {
        return state;
      }

      const effectivePrice =
        typeof salePriceZAR === 'number' && salePriceZAR > 0
          ? salePriceZAR
          : unit.listPriceVatInclZAR || 0;

      // Net proceeds: output VAT stripped if VAT registered developer (15% standard rate)
      const netProceeds = dev.isVatRegisteredDeveloper
        ? Math.round(effectivePrice / 1.15)
        : effectivePrice;

      const drawnDebt = dev.developmentFacilityDrawnZAR || 0;
      const repaidDebt = dev.developmentFacilityRepaidZAR || 0;
      const outstandingDebt = Math.max(0, drawnDebt - repaidDebt);

      const debtPayment = Math.min(netProceeds, outstandingDebt);
      const surplusCash = netProceeds - debtPayment;
      const newRepaidDebt = repaidDebt + debtPayment;

      const updatedUnits: DevelopmentUnit[] = (dev.units || []).map((u) =>
        u.id === unitId
          ? {
              ...u,
              status: 'Sold & Transferred' as const,
              buyerName: buyerName || u.buyerName || 'Private Buyer',
              soldDate: new Date().toISOString().split('T')[0],
              listPriceVatInclZAR: effectivePrice,
            }
          : u
      );

      // Update linked funding source if exists
      const updatedFunding = state.funding.map((f) => {
        if (f.id === dev.linkedFundingSourceId || f.linkedDealId === dev.id) {
          const updatedRepaid = (f.totalRepaidZAR || 0) + debtPayment;
          const isSettled = updatedRepaid >= (f.capitalAmountZAR || 0);
          return {
            ...f,
            totalRepaidZAR: updatedRepaid,
            status: isSettled ? ('Settled' as const) : f.status,
          };
        }
        return f;
      });

      return {
        developments: state.developments.map((d) =>
          d.id === devId
            ? {
                ...d,
                developmentFacilityRepaidZAR: newRepaidDebt,
                units: updatedUnits,
              }
            : d
        ),
        funding: updatedFunding,
        liquidCapitalReserve: state.liquidCapitalReserve + surplusCash,
      };
    }),

  graduateRetainedUnitsToRental: (devId) => {
    const dev = get().developments.find((d) => d.id === devId);
    if (!dev) throw new Error(`Development with id ${devId} not found`);

    const retainedUnits = (dev.units || []).filter(
      (u) => u.status === 'Retained for Rental' && !u.graduatedRentalId
    );
    if (retainedUnits.length === 0) {
      throw new Error(`No ungraduated retained units found in development ${dev.title}`);
    }

    const today = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newRentalId = `rental-dev-${dev.id}-${Date.now()}`;

    const outstandingDebt = Math.max(
      0,
      (dev.developmentFacilityDrawnZAR || 0) - (dev.developmentFacilityRepaidZAR || 0)
    );
    const totalCostBasis = retainedUnits.reduce((sum, u) => sum + (u.allocatedCostBasisZAR || 0), 0);
    const totalMarketValuation = retainedUnits.reduce(
      (sum, u) => sum + (u.listPriceVatInclZAR || (u.allocatedCostBasisZAR || 0) * 1.25),
      0
    );
    const totalGrossRent = retainedUnits.reduce((sum, u) => sum + (u.estimatedMonthlyRentZAR || 0), 0);
    const totalFloorArea = retainedUnits.reduce((sum, u) => sum + (u.floorAreaSqm || 0), 0);
    const isSection13Sex = retainedUnits.length >= 5;

    const leases: Lease[] = retainedUnits.map((u, idx) => ({
      id: `lease-${newRentalId}-${u.id || idx + 1}`,
      unitName: u.unitNumber ? `Unit ${u.unitNumber}` : `Unit ${idx + 1}`,
      tenantName: 'Tenant Pending Placement',
      tenantPhone: '+27 —',
      tenantEmail: 'pending@tenant.co.za',
      leaseStartDate: today,
      leaseEndDate: oneYearLater,
      monthlyRentZAR: u.estimatedMonthlyRentZAR || 0,
      depositHeldZAR:
        u.depositHeldZAR && u.depositHeldZAR > 0
          ? u.depositHeldZAR
          : (u.estimatedMonthlyRentZAR || 0) * 2,
      annualEscalationPercent: 7.0,
      status: 'Vacant' as const,
      roomType: u.configuration,
    }));

    const newRental: RentalProperty = {
      id: newRentalId,
      title: `${dev.title} (Retained Rental)`,
      address: dev.address,
      city: dev.city,
      province: dev.province,
      propertyType:
        dev.developmentType === 'Sectional Title Apartments'
          ? 'Sectional Title Apartment'
          : 'Freehold House',
      numberOfUnits: retainedUnits.length,
      floorAreaSqm: totalFloorArea,
      marketValueZAR: totalMarketValuation,
      purchasePriceZAR: totalCostBasis > 0 ? totalCostBasis : totalMarketValuation,
      purchaseDate: today,
      outstandingBondBalanceZAR: outstandingDebt,
      bondInterestRatePercent: 11.75,
      loanTermYears: 15,
      monthlyBondPaymentZAR:
        outstandingDebt > 0
          ? calculateMonthlyBondRepayment(outstandingDebt, 11.75, 15)
          : 0,
      leases,
      utilityType: 'prepaid_submeter',
      managementType: 'Agency',
      agencyCommissionPercent: 8.0,
      agencyVatApplicable: true,
      monthlyGrossRentZAR: totalGrossRent,
      monthlyLeviesZAR: 0,
      monthlyRatesTaxesZAR: Math.round(totalGrossRent * 0.06),
      monthlyAgentFeeZAR: Math.round(totalGrossRent * 0.08 * 1.15),
      monthlyMaintenanceReserveZAR: Math.max(500, retainedUnits.length * 250),
      maintenanceHistory: [],
      status: 'Vacant',
      section13sexAnnualShieldZAR: isSection13Sex
        ? Math.round(totalCostBasis * 0.55 * 0.05 * 0.27)
        : undefined,
      notes: `Graduated from Development: ${dev.title}. ${retainedUnits.length} units retained under Hybrid Split-Exit strategy.${
        isSection13Sex ? ' Qualified for SARS Section 13sex 55% tax write-off (>= 5 residential units).' : ''
      }`,
      convertedFromDevelopmentId: dev.id,
      section13SexEligible: isSection13Sex,
    };

    const updatedDevelopments = get().developments.map((d) =>
      d.id === devId
        ? {
            ...d,
            units: (d.units || []).map((u) =>
              retainedUnits.some((ru) => ru.id === u.id)
                ? { ...u, graduatedRentalId: newRentalId }
                : u
            ),
          }
        : d
    );

    const updatedFunding = get().funding.map((f) => {
      if (f.id === dev.linkedFundingSourceId || f.linkedDealId === dev.id) {
        return {
          ...f,
          linkedDealId: newRental.id,
          linkedDealName: newRental.title,
        };
      }
      return f;
    });

    const updatedTasks = syncLeaseExpiryTasks(
      get().tasks,
      newRental.id,
      newRental.title,
      newRental.leases
    );

    set({
      rentals: [newRental, ...get().rentals],
      developments: updatedDevelopments,
      funding: updatedFunding,
      tasks: updatedTasks,
    });

    return newRental;
  },

  promoteOpportunityToDevelopment: (oppId) => {
    const opp = get().opportunities.find((o) => o.id === oppId);
    if (!opp) return '';

    const unitCount = opp.numberOfUnits && opp.numberOfUnits > 1 ? Math.round(opp.numberOfUnits) : 4;
    const totalArea = opp.floorAreaSqm || 320;
    const unitArea = Math.round(totalArea / unitCount);
    const landPrice = opp.purchasePrice;
    const buildCostPerSqm =
      opp.floorAreaSqm && opp.estimatedRehabCost
        ? Math.round(opp.estimatedRehabCost / opp.floorAreaSqm)
        : 9500;
    const estimatedUnitListPrice = Math.round(
      (opp.targetExitPrice || landPrice * 1.5) / unitCount
    );
    const estimatedUnitRent = Math.round(
      (opp.monthlyRentalEstimate || 36000) / unitCount
    );

    const newDevId = `dev-${Date.now()}`;
    const units: DevelopmentUnit[] = Array.from({ length: unitCount }, (_, idx) => ({
      id: `dev-unit-${Date.now()}-${idx + 1}`,
      unitNumber: `${idx + 1}`,
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: unitArea,
      allocatedCostBasisZAR: Math.round((landPrice + buildCostPerSqm * totalArea) / unitCount),
      listPriceVatInclZAR: estimatedUnitListPrice,
      estimatedMonthlyRentZAR: estimatedUnitRent,
      status: 'Available',
    }));

    const newDev: DevelopmentProject = {
      id: newDevId,
      title: `${opp.title} (Development)`,
      address: opp.address,
      city: opp.city,
      province: opp.province,
      investmentNodeId: (opp as any).investmentNodeId,
      developmentType: 'Subdivision & Cluster',
      isVatRegisteredDeveloper: true,
      taxEntityType: 'Company (27%)',
      currentPhase: 'Feasibility',
      preApprovalMonths: 4,
      constructionMonths: opp.holdingPeriodMonths || 8,
      sellDownMonths: 3,
      landPurchasePriceZAR: landPrice,
      acquisitionCostsZAR: opp.costs ? opp.costs.totalAcquisitionCost - landPrice : 75000,
      sec118ArrearsZAR: 0,
      softCosts: {
        townPlannerZAR: 45000,
        architectZAR: 85000,
        structuralCivilEngineerZAR: 55000,
        quantitySurveyorZAR: 35000,
        nhbrcEnrolmentFeeZAR: 40000,
        councilBulkContributionsZAR: 120000,
        planScrutinyAndSubdivisionFeesZAR: 25000,
        marketingAndShowUnitZAR: 30000,
      },
      totalBuildableAreaSqm: totalArea,
      budgetedHardCostPerSqmZAR: buildCostPerSqm,
      contingencyPercent: 7.5,
      boqItems: [],
      monthlyPreApprovalHoldingBurnZAR: (opp.monthlyLevies || 0) + (opp.monthlyRatesTaxes || 0),
      monthlyConstructionHoldingBurnZAR:
        (opp.monthlyLevies || 0) + (opp.monthlyRatesTaxes || 0) + 8000,
      developmentFacilityLimitZAR: Math.round((landPrice + totalArea * buildCostPerSqm) * 0.75),
      developmentFacilityDrawnZAR: 0,
      developmentFacilityRepaidZAR: 0,
      preSalesHurdlePercent: 60,
      approvals: {
        splumaRezoningSubdivision: { status: 'Not Started' },
        sgDiagramApproval: { status: 'Not Started' },
        municipalBuildingPlans: { status: 'Not Started' },
        nhbrcEnrolment: { status: 'Not Started' },
        sectionalTitleRegister: { status: 'Not Started' },
        occupancyCertificate: { status: 'Not Started' },
      },
      units,
    };

    const onboardingTask: TaskItem = {
      id: `task-${Date.now()}-dev-conveyance`,
      title: `Instruct conveyancer & town planner for ${newDev.title}`,
      description: `Promoted from Deal Analyzer. Begin SPLUMA rezoning and title deed search. Land purchase price: R ${landPrice.toLocaleString('en-ZA')}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'Urgent',
      status: 'Pending',
      linkedEntity: {
        type: 'development',
        id: newDev.id,
        name: newDev.title,
      },
      createdAt: new Date().toISOString().split('T')[0],
    };

    set((state) => ({
      developments: [newDev, ...state.developments],
      opportunities: state.opportunities.map((o) =>
        o.id === oppId ? { ...o, status: 'Promoted to Development' as any } : o
      ),
      tasks: [onboardingTask, ...state.tasks],
    }));

    return newDev.id;
  },

  addDevelopmentBOQItem: (devId, item) =>
    set((state) => ({
      developments: state.developments.map((d) => {
        if (d.id !== devId) return d;
        const newItem: BOQItem = {
          ...item,
          id: `boq-${Date.now()}`,
          varianceZAR: (item.actualCostZAR || 0) - (item.baselineTotalZAR || 0),
        };
        return {
          ...d,
          boqItems: [...(d.boqItems || []), newItem],
        };
      }),
    })),

  updateDevelopmentBOQItem: (devId, boqId, updates) =>
    set((state) => ({
      developments: state.developments.map((d) => {
        if (d.id !== devId) return d;
        return {
          ...d,
          boqItems: (d.boqItems || []).map((item) => {
            if (item.id !== boqId) return item;
            const updated = { ...item, ...updates };
            updated.varianceZAR =
              (updated.actualCostZAR || 0) - (updated.baselineTotalZAR || 0);
            return updated;
          }),
        };
      }),
    })),

  deleteDevelopmentBOQItem: (devId, boqId) =>
    set((state) => ({
      developments: state.developments.map((d) => {
        if (d.id !== devId) return d;
        return {
          ...d,
          boqItems: (d.boqItems || []).filter((item) => item.id !== boqId),
        };
      }),
    })),
});
