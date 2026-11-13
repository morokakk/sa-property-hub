import { StateCreator } from 'zustand';
import {
  DevelopmentProject,
  DevelopmentUnit,
  BOQItem,
  RentalProperty,
  Lease,
  TaskItem,
  DevelopmentApprovalStatus,
} from '@/types';
import { RootStoreState, DevelopmentSlice } from '../types';
import { INITIAL_DEVELOPMENTS } from '../initialData';
import { syncDevelopmentApprovalTasks, syncLeaseExpiryTasks } from '../utils/taskSync';
import {
  calculateMonthlyBondRepayment,
  buildDefaultSoftCostsFromAllowance,
} from '@/lib/calculations/propertyMetrics';
import { calculateZoningEnvelope } from '@/lib/calculations/zoning';
import { trackPrivacySafeEvent } from '@/lib/analytics/posthogClient';

export const createDevelopmentSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  DevelopmentSlice
> = (set, get) => ({
  developments: INITIAL_DEVELOPMENTS,

  addDevelopment: (dev) =>
    set((state) => {
      trackPrivacySafeEvent('development_created', {
        development_type: dev.developmentType,
        units_count: dev.units?.length ?? 0,
        is_vat_registered: dev.isVatRegisteredDeveloper,
      });
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

      let updatedFunding = state.funding;
      if (
        target &&
        (updates.developmentFacilityRepaidZAR !== undefined ||
          updates.developmentFacilityLimitZAR !== undefined)
      ) {
        updatedFunding = state.funding.map((f) => {
          if (f.id === target.linkedFundingSourceId || f.linkedDealId === target.id) {
            const nextRepaid =
              updates.developmentFacilityRepaidZAR !== undefined
                ? updates.developmentFacilityRepaidZAR
                : f.totalRepaidZAR;
            const nextLimit =
              updates.developmentFacilityLimitZAR !== undefined && updates.developmentFacilityLimitZAR > 0
                ? updates.developmentFacilityLimitZAR
                : f.capitalAmountZAR;
            const isSettled = nextRepaid >= nextLimit && nextLimit > 0;
            return {
              ...f,
              capitalAmountZAR: nextLimit,
              totalRepaidZAR: nextRepaid,
              status: isSettled ? ('Settled' as const) : f.status,
            };
          }
          return f;
        });
      }

      return {
        developments: updatedDevelopments,
        tasks,
        funding: updatedFunding,
      };
    }),

  deleteDevelopment: (id) =>
    set((state) => ({
      developments: state.developments.filter((d) => d.id !== id),
      tasks: state.tasks.filter(
        (t) =>
          !(
            t.linkedEntity?.id === id &&
            (t.id.startsWith('task-dev-approval-') || t.id.startsWith('task-dev-comment-'))
          )
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

      trackPrivacySafeEvent('development_unit_sold', {
        development_type: dev.developmentType,
        debt_repaid_boolean: debtPayment > 0,
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
      zoningProfile: dev.zoningProfile ? structuredClone(dev.zoningProfile) : undefined,
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

    trackPrivacySafeEvent('development_units_graduated_to_rental', {
      retained_units_count: retainedUnits.length,
      section_13sex_eligible: isSection13Sex,
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
      opp.hardCostPerSqmZAR && opp.hardCostPerSqmZAR > 0
        ? opp.hardCostPerSqmZAR
        : opp.floorAreaSqm && opp.estimatedRehabCost
        ? Math.round(opp.estimatedRehabCost / opp.floorAreaSqm)
        : 9800;
    const hardBuildCostZAR = totalArea * buildCostPerSqm;
    const softCosts =
      opp.useCustomSoftCosts && opp.softCosts
        ? { ...opp.softCosts }
        : buildDefaultSoftCostsFromAllowance(
            hardBuildCostZAR,
            opp.softCostAllowancePercent ?? 15
          );
    const estimatedUnitListPrice = Math.round(
      (opp.targetExitPrice || landPrice * 1.5) / unitCount
    );
    const estimatedUnitRent = Math.round(
      (opp.monthlyRentalEstimate || 36000) / unitCount
    );

    const exitMode = opp.developmentExitMode ?? 'Build-to-Sell';
    const retainedUnitsCount =
      exitMode === 'Build-to-Rent Hold'
        ? unitCount
        : exitMode === 'Split-Exit Hybrid'
        ? Math.min(unitCount, Math.max(0, Math.round(opp.unitsRetainedCount ?? Math.floor(unitCount / 2))))
        : 0;
    const soldUnitsCount = Math.max(0, unitCount - retainedUnitsCount);

    const newDevId = `dev-${Date.now()}`;
    const units: DevelopmentUnit[] = Array.from({ length: unitCount }, (_, idx) => ({
      id: `dev-unit-${Date.now()}-${idx + 1}`,
      unitNumber: `${idx + 1}`,
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: unitArea,
      allocatedCostBasisZAR: Math.round((landPrice + hardBuildCostZAR) / unitCount),
      listPriceVatInclZAR: estimatedUnitListPrice,
      estimatedMonthlyRentZAR: estimatedUnitRent,
      status: idx < soldUnitsCount ? 'Available' : 'Retained for Rental',
    }));

    const preApprovalMonths = opp.preApprovalMonths ?? 4;
    const constructionMonths = opp.constructionMonths ?? (opp.holdingPeriodMonths || 8);
    const baseRatesAndLevies = (opp.monthlyLevies || 0) + (opp.monthlyRatesTaxes || 0);
    const preApprovalBurn = opp.monthlyPreApprovalBurnZAR ?? baseRatesAndLevies;
    const constructionBurn = opp.monthlyConstructionBurnZAR ?? (baseRatesAndLevies + 8000);
    const seniorLtcFraction = (opp.seniorDebtLtcPercent ?? 65) / 100;

    const existingLinkedFunding = get().funding.find((f) => f.linkedDealId === opp.id);
    const newDevTitle = opp.title.includes('(Development)') ? opp.title : `${opp.title} (Development)`;

    const zoningProfile = opp.zoningProfile ? structuredClone(opp.zoningProfile) : undefined;
    let splumaStatus: DevelopmentApprovalStatus = 'Not Started';
    let splumaNotes: string | undefined = undefined;
    if (zoningProfile) {
      const zoningResult = calculateZoningEnvelope(zoningProfile, totalArea, unitCount);
      if (!zoningResult.isSplumaRezoningTriggered) {
        splumaStatus = 'N/A';
        splumaNotes = 'As-of-Right municipal zoning rights confirmed. No SPLUMA Section 42 rezoning tribunal required.';
      }
    }

    const newDev: DevelopmentProject = {
      id: newDevId,
      title: newDevTitle,
      address: opp.address,
      city: opp.city,
      province: opp.province,
      investmentNodeId: (opp as any).investmentNodeId,
      developmentType: opp.developmentType ?? 'Subdivision & Cluster',
      isVatRegisteredDeveloper: opp.isVatRegisteredDeveloper ?? true,
      taxEntityType: 'Company (27%)',
      currentPhase: 'Feasibility',
      preApprovalMonths,
      constructionMonths,
      sellDownMonths: 3,
      landPurchasePriceZAR: landPrice,
      acquisitionCostsZAR: opp.costs ? opp.costs.totalAcquisitionCost - landPrice : 75000,
      sec118ArrearsZAR: opp.municipalArrearsZAR || 0,
      softCosts,
      totalBuildableAreaSqm: totalArea,
      budgetedHardCostPerSqmZAR: buildCostPerSqm,
      contingencyPercent: opp.contingencyPercent ?? 7.5,
      boqItems: [],
      monthlyPreApprovalHoldingBurnZAR: preApprovalBurn,
      monthlyConstructionHoldingBurnZAR: constructionBurn,
      developmentFacilityLimitZAR: Math.round((landPrice + hardBuildCostZAR) * seniorLtcFraction),
      developmentFacilityDrawnZAR: 0,
      developmentFacilityRepaidZAR: 0,
      preSalesHurdlePercent: opp.preSalesHurdlePercent ?? (get().investorProfile?.defaultPreSalesHurdlePercent ?? 40),
      linkedFundingSourceId: existingLinkedFunding?.id,
      zoningProfile,
      approvals: {
        splumaRezoningSubdivision: {
          status: splumaStatus,
          notes: splumaNotes,
        },
        sgDiagramApproval: { status: 'Not Started' },
        municipalBuildingPlans: { status: 'Not Started' },
        nhbrcEnrolment: { status: 'Not Started' },
        sectionalTitleRegister: { status: 'Not Started' },
        occupancyCertificate: { status: 'Not Started' },
      },
      units,
      commentsLedger: Array.isArray(opp.commentsLedger)
        ? opp.commentsLedger.map((comment, idx) => ({
            ...structuredClone(comment),
            id: `dev-comment-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          }))
        : [],
    };

    const onboardingTask: TaskItem = {
      id: `task-${Date.now()}-dev-conveyance`,
      title: `Instruct conveyancer & town planner for ${newDev.title}`,
      description:
        splumaStatus === 'N/A'
          ? `Promoted from Deal Analyzer. As-of-Right development (no SPLUMA rezoning required). Begin building plan submissions. Land purchase price: R ${landPrice.toLocaleString('en-ZA')}`
          : `Promoted from Deal Analyzer. Begin SPLUMA rezoning and title deed search. Land purchase price: R ${landPrice.toLocaleString('en-ZA')}`,
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
      funding: state.funding.map((f) =>
        f.linkedDealId === oppId
          ? {
              ...f,
              linkedDealId: newDev.id,
              linkedDealName: newDev.title,
            }
          : f
      ),
      tasks: [onboardingTask, ...state.tasks],
    }));

    trackPrivacySafeEvent('development_promoted_from_analyzer', {
      development_type: newDev.developmentType,
      units_count: unitCount,
      exit_mode: exitMode,
    });

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
