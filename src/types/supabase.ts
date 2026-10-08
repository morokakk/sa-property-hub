export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      boq_items: {
        Row: {
          actual_cash_outflow_zar: number | null
          actual_cost_zar: number
          baseline_total_zar: number
          baseline_unit_cost_zar: number
          category: string
          commercial_retail_value_zar: number | null
          created_at: string
          flip_id: string
          id: string
          invoice_ref: string | null
          is_sponsored_or_barter: boolean | null
          item_description: string
          milestone_phase: string | null
          quantity: number
          retention_percent: number | null
          status: string
          supplier_or_contractor: string
          unit: string
          updated_at: string
          user_id: string
          variance_zar: number
        }
        Insert: {
          actual_cash_outflow_zar?: number | null
          actual_cost_zar?: number
          baseline_total_zar?: number
          baseline_unit_cost_zar?: number
          category: string
          commercial_retail_value_zar?: number | null
          created_at?: string
          flip_id: string
          id?: string
          invoice_ref?: string | null
          is_sponsored_or_barter?: boolean | null
          item_description: string
          milestone_phase?: string | null
          quantity?: number
          retention_percent?: number | null
          status?: string
          supplier_or_contractor?: string
          unit?: string
          updated_at?: string
          user_id?: string
          variance_zar?: number
        }
        Update: {
          actual_cash_outflow_zar?: number | null
          actual_cost_zar?: number
          baseline_total_zar?: number
          baseline_unit_cost_zar?: number
          category?: string
          commercial_retail_value_zar?: number | null
          created_at?: string
          flip_id?: string
          id?: string
          invoice_ref?: string | null
          is_sponsored_or_barter?: boolean | null
          item_description?: string
          milestone_phase?: string | null
          quantity?: number
          retention_percent?: number | null
          status?: string
          supplier_or_contractor?: string
          unit?: string
          updated_at?: string
          user_id?: string
          variance_zar?: number
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_flip_id_fkey"
            columns: ["flip_id"]
            isOneToOne: false
            referencedRelation: "flips"
            referencedColumns: ["id"]
          },
        ]
      }
      flips: {
        Row: {
          acquisition_costs_zar: number | null
          actual_sale_price_zar: number | null
          address: string
          agm_date: string | null
          baseline_renovation_budget_zar: number | null
          bond_payment_effective_date: string | null
          capital_raised_zar: number | null
          city: string
          co_funders_notes: string | null
          coc_checklist: Json
          converted_to_rental_id: string | null
          created_at: string
          current_phase: string | null
          draw_schedule: Json
          drive_vault: Json
          estimated_duration_months: number | null
          exit_commission_percent: number | null
          exit_notes: string | null
          exit_strategy: string | null
          funding_required_zar: number | null
          id: string
          linked_funding_ids: string[]
          monthly_bond_payment_zar: number | null
          monthly_holding_cost_zar: number | null
          monthly_levies_zar: number | null
          monthly_other_holding_cost_zar: number | null
          monthly_rates_taxes_zar: number | null
          municipal_clearance: Json
          municipal_valuation_zar: number | null
          net_cash_proceeds_zar: number | null
          notes: string | null
          primary_funder_contact: string | null
          primary_funder_name: string | null
          primary_funder_type: string | null
          promised_payout_schedule: string | null
          promised_return_rate_percent: number | null
          promised_return_type: string | null
          property_type: string | null
          purchase_date: string | null
          purchase_price_zar: number | null
          security_offered: string | null
          sold_date: string | null
          source: string | null
          status: string
          strategy: string | null
          target_completion_date: string | null
          target_exit_price_zar: number | null
          tax_entity_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquisition_costs_zar?: number | null
          actual_sale_price_zar?: number | null
          address?: string
          agm_date?: string | null
          baseline_renovation_budget_zar?: number | null
          bond_payment_effective_date?: string | null
          capital_raised_zar?: number | null
          city?: string
          co_funders_notes?: string | null
          coc_checklist?: Json
          converted_to_rental_id?: string | null
          created_at?: string
          current_phase?: string | null
          draw_schedule?: Json
          drive_vault?: Json
          estimated_duration_months?: number | null
          exit_commission_percent?: number | null
          exit_notes?: string | null
          exit_strategy?: string | null
          funding_required_zar?: number | null
          id?: string
          linked_funding_ids?: string[]
          monthly_bond_payment_zar?: number | null
          monthly_holding_cost_zar?: number | null
          monthly_levies_zar?: number | null
          monthly_other_holding_cost_zar?: number | null
          monthly_rates_taxes_zar?: number | null
          municipal_clearance?: Json
          municipal_valuation_zar?: number | null
          net_cash_proceeds_zar?: number | null
          notes?: string | null
          primary_funder_contact?: string | null
          primary_funder_name?: string | null
          primary_funder_type?: string | null
          promised_payout_schedule?: string | null
          promised_return_rate_percent?: number | null
          promised_return_type?: string | null
          property_type?: string | null
          purchase_date?: string | null
          purchase_price_zar?: number | null
          security_offered?: string | null
          sold_date?: string | null
          source?: string | null
          status?: string
          strategy?: string | null
          target_completion_date?: string | null
          target_exit_price_zar?: number | null
          tax_entity_type?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          acquisition_costs_zar?: number | null
          actual_sale_price_zar?: number | null
          address?: string
          agm_date?: string | null
          baseline_renovation_budget_zar?: number | null
          bond_payment_effective_date?: string | null
          capital_raised_zar?: number | null
          city?: string
          co_funders_notes?: string | null
          coc_checklist?: Json
          converted_to_rental_id?: string | null
          created_at?: string
          current_phase?: string | null
          draw_schedule?: Json
          drive_vault?: Json
          estimated_duration_months?: number | null
          exit_commission_percent?: number | null
          exit_notes?: string | null
          exit_strategy?: string | null
          funding_required_zar?: number | null
          id?: string
          linked_funding_ids?: string[]
          monthly_bond_payment_zar?: number | null
          monthly_holding_cost_zar?: number | null
          monthly_levies_zar?: number | null
          monthly_other_holding_cost_zar?: number | null
          monthly_rates_taxes_zar?: number | null
          municipal_clearance?: Json
          municipal_valuation_zar?: number | null
          net_cash_proceeds_zar?: number | null
          notes?: string | null
          primary_funder_contact?: string | null
          primary_funder_name?: string | null
          primary_funder_type?: string | null
          promised_payout_schedule?: string | null
          promised_return_rate_percent?: number | null
          promised_return_type?: string | null
          property_type?: string | null
          purchase_date?: string | null
          purchase_price_zar?: number | null
          security_offered?: string | null
          sold_date?: string | null
          source?: string | null
          status?: string
          strategy?: string | null
          target_completion_date?: string | null
          target_exit_price_zar?: number | null
          tax_entity_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funding_sources: {
        Row: {
          capital_amount_zar: number
          created_at: string
          delay_extension_days: number | null
          delay_notes: string | null
          disbursement_date: string
          email_phone: string
          entity_or_contact: string
          funding_type: string
          id: string
          lender_name: string
          linked_deal_id: string | null
          linked_deal_name: string | null
          maturity_date: string
          notes: string | null
          original_maturity_date: string | null
          payment_schedule: string
          return_rate_percent: number
          return_terms_type: string
          status: string
          total_interest_paid_zar: number | null
          total_repaid_zar: number
          tranches: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          capital_amount_zar?: number
          created_at?: string
          delay_extension_days?: number | null
          delay_notes?: string | null
          disbursement_date?: string
          email_phone?: string
          entity_or_contact?: string
          funding_type: string
          id?: string
          lender_name: string
          linked_deal_id?: string | null
          linked_deal_name?: string | null
          maturity_date?: string
          notes?: string | null
          original_maturity_date?: string | null
          payment_schedule?: string
          return_rate_percent?: number
          return_terms_type?: string
          status?: string
          total_interest_paid_zar?: number | null
          total_repaid_zar?: number
          tranches?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          capital_amount_zar?: number
          created_at?: string
          delay_extension_days?: number | null
          delay_notes?: string | null
          disbursement_date?: string
          email_phone?: string
          entity_or_contact?: string
          funding_type?: string
          id?: string
          lender_name?: string
          linked_deal_id?: string | null
          linked_deal_name?: string | null
          maturity_date?: string
          notes?: string | null
          original_maturity_date?: string | null
          payment_schedule?: string
          return_rate_percent?: number
          return_terms_type?: string
          status?: string
          total_interest_paid_zar?: number | null
          total_repaid_zar?: number
          tranches?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          address: string
          agency_vat_applicable: boolean | null
          agm_date: string | null
          amenity_scorecard: Json | null
          ancillary_incomes: Json | null
          annual_capital_growth_percent: number | null
          annual_expense_inflation_percent: number | null
          annual_insurance_zar: number | null
          annual_rental_escalation_percent: number | null
          auctioneer_commission_zar: number | null
          bond_ltv: number | null
          bond_term_years: number | null
          built_in_equity_percent: number | null
          built_in_equity_zar: number | null
          cap_rate: number | null
          capital_raised_zar: number | null
          city: string
          co_funders_notes: string | null
          costs: Json | null
          created_at: string
          custom_bond_reg_zar: number | null
          custom_conveyancing_zar: number | null
          custom_transfer_duty_zar: number | null
          deposit_zar: number | null
          drive_vault: Json | null
          estimated_rehab_cost_zar: number | null
          exit_commission_percent: number | null
          funding_required_zar: number | null
          gross_yield: number | null
          holding_period_months: number | null
          id: string
          initial_capital_required_zar: number | null
          interest_rate_percent: number | null
          loan_term_years: number | null
          loan_to_value_percent: number | null
          management_fee_percent: number | null
          monthly_bond_payment_zar: number | null
          monthly_cash_flow_zar: number | null
          monthly_communal_services_zar: number | null
          monthly_holding_cost_zar: number | null
          monthly_levies_zar: number | null
          monthly_other_holding_cost_zar: number | null
          monthly_rates_taxes_zar: number | null
          monthly_rental_estimate_zar: number | null
          municipal_arrears_zar: number | null
          net_roi: number | null
          notes: string | null
          open_market_value_zar: number | null
          pass_notes: string | null
          pass_reason: string | null
          passed_at: string | null
          primary_funder_contact: string | null
          primary_funder_name: string | null
          primary_funder_type: string | null
          projected_flip_net_profit_zar: number | null
          projected_flip_roi: number | null
          promised_payout_schedule: string | null
          promised_return_rate_percent: number | null
          promised_return_type: string | null
          property_type: string | null
          province: string | null
          purchase_price_zar: number | null
          section_13sex: Json | null
          security_offered: string | null
          source: string | null
          status: string
          strategy: string | null
          target_exit_price_zar: number | null
          title: string
          updated_at: string
          user_id: string
          vacancy_rate_percent: number | null
        }
        Insert: {
          address?: string
          agency_vat_applicable?: boolean | null
          agm_date?: string | null
          amenity_scorecard?: Json | null
          ancillary_incomes?: Json | null
          annual_capital_growth_percent?: number | null
          annual_expense_inflation_percent?: number | null
          annual_insurance_zar?: number | null
          annual_rental_escalation_percent?: number | null
          auctioneer_commission_zar?: number | null
          bond_ltv?: number | null
          bond_term_years?: number | null
          built_in_equity_percent?: number | null
          built_in_equity_zar?: number | null
          cap_rate?: number | null
          capital_raised_zar?: number | null
          city?: string
          co_funders_notes?: string | null
          costs?: Json | null
          created_at?: string
          custom_bond_reg_zar?: number | null
          custom_conveyancing_zar?: number | null
          custom_transfer_duty_zar?: number | null
          deposit_zar?: number | null
          drive_vault?: Json | null
          estimated_rehab_cost_zar?: number | null
          exit_commission_percent?: number | null
          funding_required_zar?: number | null
          gross_yield?: number | null
          holding_period_months?: number | null
          id?: string
          initial_capital_required_zar?: number | null
          interest_rate_percent?: number | null
          loan_term_years?: number | null
          loan_to_value_percent?: number | null
          management_fee_percent?: number | null
          monthly_bond_payment_zar?: number | null
          monthly_cash_flow_zar?: number | null
          monthly_communal_services_zar?: number | null
          monthly_holding_cost_zar?: number | null
          monthly_levies_zar?: number | null
          monthly_other_holding_cost_zar?: number | null
          monthly_rates_taxes_zar?: number | null
          monthly_rental_estimate_zar?: number | null
          municipal_arrears_zar?: number | null
          net_roi?: number | null
          notes?: string | null
          open_market_value_zar?: number | null
          pass_notes?: string | null
          pass_reason?: string | null
          passed_at?: string | null
          primary_funder_contact?: string | null
          primary_funder_name?: string | null
          primary_funder_type?: string | null
          projected_flip_net_profit_zar?: number | null
          projected_flip_roi?: number | null
          promised_payout_schedule?: string | null
          promised_return_rate_percent?: number | null
          promised_return_type?: string | null
          property_type?: string | null
          province?: string | null
          purchase_price_zar?: number | null
          section_13sex?: Json | null
          security_offered?: string | null
          source?: string | null
          status?: string
          strategy?: string | null
          target_exit_price_zar?: number | null
          title: string
          updated_at?: string
          user_id?: string
          vacancy_rate_percent?: number | null
        }
        Update: {
          address?: string
          agency_vat_applicable?: boolean | null
          agm_date?: string | null
          amenity_scorecard?: Json | null
          ancillary_incomes?: Json | null
          annual_capital_growth_percent?: number | null
          annual_expense_inflation_percent?: number | null
          annual_insurance_zar?: number | null
          annual_rental_escalation_percent?: number | null
          auctioneer_commission_zar?: number | null
          bond_ltv?: number | null
          bond_term_years?: number | null
          built_in_equity_percent?: number | null
          built_in_equity_zar?: number | null
          cap_rate?: number | null
          capital_raised_zar?: number | null
          city?: string
          co_funders_notes?: string | null
          costs?: Json | null
          created_at?: string
          custom_bond_reg_zar?: number | null
          custom_conveyancing_zar?: number | null
          custom_transfer_duty_zar?: number | null
          deposit_zar?: number | null
          drive_vault?: Json | null
          estimated_rehab_cost_zar?: number | null
          exit_commission_percent?: number | null
          funding_required_zar?: number | null
          gross_yield?: number | null
          holding_period_months?: number | null
          id?: string
          initial_capital_required_zar?: number | null
          interest_rate_percent?: number | null
          loan_term_years?: number | null
          loan_to_value_percent?: number | null
          management_fee_percent?: number | null
          monthly_bond_payment_zar?: number | null
          monthly_cash_flow_zar?: number | null
          monthly_communal_services_zar?: number | null
          monthly_holding_cost_zar?: number | null
          monthly_levies_zar?: number | null
          monthly_other_holding_cost_zar?: number | null
          monthly_rates_taxes_zar?: number | null
          monthly_rental_estimate_zar?: number | null
          municipal_arrears_zar?: number | null
          net_roi?: number | null
          notes?: string | null
          open_market_value_zar?: number | null
          pass_notes?: string | null
          pass_reason?: string | null
          passed_at?: string | null
          primary_funder_contact?: string | null
          primary_funder_name?: string | null
          primary_funder_type?: string | null
          projected_flip_net_profit_zar?: number | null
          projected_flip_roi?: number | null
          promised_payout_schedule?: string | null
          promised_return_rate_percent?: number | null
          promised_return_type?: string | null
          property_type?: string | null
          province?: string | null
          purchase_price_zar?: number | null
          section_13sex?: Json | null
          security_offered?: string | null
          source?: string | null
          status?: string
          strategy?: string | null
          target_exit_price_zar?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          vacancy_rate_percent?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          ai_settings: Json | null
          analyzer_draft: Json | null
          bank_name: string | null
          baseline_hurdle_yield_percent: number | null
          bio_summary: string | null
          branch_code: string | null
          contact_number: string | null
          created_at: string
          default_agent_commission_percent: number | null
          default_prime_rate_percent: number | null
          default_tax_entity_type: string | null
          email: string | null
          entity_name: string
          id: string
          liquid_capital_reserve_zar: number | null
          logo_base64: string | null
          physical_address: string | null
          registration_or_id: string | null
          remittance_instructions: string | null
          rental_forecast_view: string | null
          swift_code: string | null
          trading_as: string | null
          updated_at: string
          user_id: string
          website: string | null
          min_net_yield_percent?: number | null
          min_monthly_cashflow_zar?: number | null
          min_net_roi_percent?: number | null
          min_flip_roi_percent?: number | null
          max_day1_cash_zar?: number | null
          min_dscr?: number | null
          vat_exempt_agent?: boolean | null
          marginal_tax_rate_percent?: number | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          ai_settings?: Json | null
          analyzer_draft?: Json | null
          bank_name?: string | null
          baseline_hurdle_yield_percent?: number | null
          bio_summary?: string | null
          branch_code?: string | null
          contact_number?: string | null
          created_at?: string
          default_agent_commission_percent?: number | null
          default_prime_rate_percent?: number | null
          default_tax_entity_type?: string | null
          email?: string | null
          entity_name?: string
          id: string
          liquid_capital_reserve_zar?: number | null
          logo_base64?: string | null
          physical_address?: string | null
          registration_or_id?: string | null
          remittance_instructions?: string | null
          rental_forecast_view?: string | null
          swift_code?: string | null
          trading_as?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          min_net_yield_percent?: number | null
          min_monthly_cashflow_zar?: number | null
          min_net_roi_percent?: number | null
          min_flip_roi_percent?: number | null
          max_day1_cash_zar?: number | null
          min_dscr?: number | null
          vat_exempt_agent?: boolean | null
          marginal_tax_rate_percent?: number | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          ai_settings?: Json | null
          analyzer_draft?: Json | null
          bank_name?: string | null
          baseline_hurdle_yield_percent?: number | null
          bio_summary?: string | null
          branch_code?: string | null
          contact_number?: string | null
          created_at?: string
          default_agent_commission_percent?: number | null
          default_prime_rate_percent?: number | null
          default_tax_entity_type?: string | null
          email?: string | null
          entity_name?: string
          id?: string
          liquid_capital_reserve_zar?: number | null
          logo_base64?: string | null
          physical_address?: string | null
          registration_or_id?: string | null
          remittance_instructions?: string | null
          rental_forecast_view?: string | null
          swift_code?: string | null
          trading_as?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          min_net_yield_percent?: number | null
          min_monthly_cashflow_zar?: number | null
          min_net_roi_percent?: number | null
          min_flip_roi_percent?: number | null
          max_day1_cash_zar?: number | null
          min_dscr?: number | null
          vat_exempt_agent?: boolean | null
          marginal_tax_rate_percent?: number | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          actual_sale_price_zar: number | null
          address: string
          agency_commission_percent: number | null
          agency_contact: string | null
          agency_name: string | null
          agency_vat_applicable: boolean | null
          agm_date: string | null
          ancillary_incomes: Json
          annual_building_insurance_zar: number | null
          arrears_opening_balance_zar: number | null
          arrears_write_offs: Json | null
          bond_interest_rate_percent: number | null
          bond_payment_effective_date: string | null
          bond_revision_note: string | null
          city: string
          coc_checklist: Json
          converted_from_flip_id: string | null
          created_at: string
          drive_vault: Json
          exit_notes: string | null
          id: string
          is_brrrr_property: boolean | null
          leases: Json
          maintenance_history: Json
          management_type: string | null
          market_value_zar: number | null
          meter_readings: Json
          monthly_agent_fee_zar: number | null
          monthly_bond_payment_zar: number | null
          monthly_communal_services_zar: number | null
          monthly_gross_rent_zar: number | null
          monthly_levies_zar: number | null
          monthly_maintenance_reserve_zar: number | null
          monthly_prepaid_vending_fee_zar: number | null
          monthly_rates_taxes_zar: number | null
          net_cash_proceeds_zar: number | null
          notes: string | null
          outstanding_bond_balance_zar: number | null
          payment_records: Json | null
          prepaid_vendor_name: string | null
          property_type: string | null
          purchase_date: string | null
          purchase_price_zar: number | null
          refinance_history: Json
          section_13sex_annual_shield_zar: number | null
          sold_date: string | null
          source: string | null
          status: string
          tax_entity_type_override: string | null
          title: string
          total_equity_extracted_zar: number | null
          transactions: Json | null
          unpaid_utility_arrears_zar: number | null
          updated_at: string
          user_id: string
          utility_statements: Json
          utility_type: string | null
        }
        Insert: {
          actual_sale_price_zar?: number | null
          address?: string
          agency_commission_percent?: number | null
          agency_contact?: string | null
          agency_name?: string | null
          agency_vat_applicable?: boolean | null
          agm_date?: string | null
          ancillary_incomes?: Json
          annual_building_insurance_zar?: number | null
          arrears_opening_balance_zar?: number | null
          arrears_write_offs?: Json | null
          bond_interest_rate_percent?: number | null
          bond_payment_effective_date?: string | null
          bond_revision_note?: string | null
          city?: string
          coc_checklist?: Json
          converted_from_flip_id?: string | null
          created_at?: string
          drive_vault?: Json
          exit_notes?: string | null
          id?: string
          is_brrrr_property?: boolean | null
          leases?: Json
          maintenance_history?: Json
          management_type?: string | null
          market_value_zar?: number | null
          meter_readings?: Json
          monthly_agent_fee_zar?: number | null
          monthly_bond_payment_zar?: number | null
          monthly_communal_services_zar?: number | null
          monthly_gross_rent_zar?: number | null
          monthly_levies_zar?: number | null
          monthly_maintenance_reserve_zar?: number | null
          monthly_prepaid_vending_fee_zar?: number | null
          monthly_rates_taxes_zar?: number | null
          net_cash_proceeds_zar?: number | null
          notes?: string | null
          outstanding_bond_balance_zar?: number | null
          payment_records?: Json | null
          prepaid_vendor_name?: string | null
          property_type?: string | null
          purchase_date?: string | null
          purchase_price_zar?: number | null
          refinance_history?: Json
          section_13sex_annual_shield_zar?: number | null
          sold_date?: string | null
          source?: string | null
          status?: string
          tax_entity_type_override?: string | null
          title: string
          total_equity_extracted_zar?: number | null
          transactions?: Json | null
          unpaid_utility_arrears_zar?: number | null
          updated_at?: string
          user_id?: string
          utility_statements?: Json
          utility_type?: string | null
        }
        Update: {
          actual_sale_price_zar?: number | null
          address?: string
          agency_commission_percent?: number | null
          agency_contact?: string | null
          agency_name?: string | null
          agency_vat_applicable?: boolean | null
          agm_date?: string | null
          ancillary_incomes?: Json
          annual_building_insurance_zar?: number | null
          arrears_opening_balance_zar?: number | null
          arrears_write_offs?: Json | null
          bond_interest_rate_percent?: number | null
          bond_payment_effective_date?: string | null
          bond_revision_note?: string | null
          city?: string
          coc_checklist?: Json
          converted_from_flip_id?: string | null
          created_at?: string
          drive_vault?: Json
          exit_notes?: string | null
          id?: string
          is_brrrr_property?: boolean | null
          leases?: Json
          maintenance_history?: Json
          management_type?: string | null
          market_value_zar?: number | null
          meter_readings?: Json
          monthly_agent_fee_zar?: number | null
          monthly_bond_payment_zar?: number | null
          monthly_communal_services_zar?: number | null
          monthly_gross_rent_zar?: number | null
          monthly_levies_zar?: number | null
          monthly_maintenance_reserve_zar?: number | null
          monthly_prepaid_vending_fee_zar?: number | null
          monthly_rates_taxes_zar?: number | null
          net_cash_proceeds_zar?: number | null
          notes?: string | null
          outstanding_bond_balance_zar?: number | null
          payment_records?: Json | null
          prepaid_vendor_name?: string | null
          property_type?: string | null
          purchase_date?: string | null
          purchase_price_zar?: number | null
          refinance_history?: Json
          section_13sex_annual_shield_zar?: number | null
          sold_date?: string | null
          source?: string | null
          status?: string
          tax_entity_type_override?: string | null
          title?: string
          total_equity_extracted_zar?: number | null
          transactions?: Json | null
          unpaid_utility_arrears_zar?: number | null
          updated_at?: string
          user_id?: string
          utility_statements?: Json
          utility_type?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          account_number: string | null
          branch_location: string
          category: string
          contact_person: string | null
          created_at: string
          discount_terms: string | null
          email: string | null
          has_coc: boolean | null
          id: string
          name: string
          phone: string
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          branch_location?: string
          category?: string
          contact_person?: string | null
          created_at?: string
          discount_terms?: string | null
          email?: string | null
          has_coc?: boolean | null
          id?: string
          name: string
          phone?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_number?: string | null
          branch_location?: string
          category?: string
          contact_person?: string | null
          created_at?: string
          discount_terms?: string | null
          email?: string | null
          has_coc?: boolean | null
          id?: string
          name?: string
          phone?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          linked_entity: Json
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          linked_entity?: Json
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          linked_entity?: Json
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      investor_profiles: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          ai_settings: Json | null
          analyzer_draft: Json | null
          bank_name: string | null
          baseline_hurdle_yield_percent: number | null
          bio_summary: string | null
          branch_code: string | null
          contact_number: string | null
          created_at: string | null
          default_agent_commission_percent: number | null
          default_prime_rate_percent: number | null
          default_tax_entity_type: string | null
          email: string | null
          entity_name: string | null
          id: string | null
          liquid_capital_reserve_zar: number | null
          logo_base64: string | null
          physical_address: string | null
          registration_or_id: string | null
          remittance_instructions: string | null
          rental_forecast_view: string | null
          swift_code: string | null
          trading_as: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          ai_settings?: Json | null
          analyzer_draft?: Json | null
          bank_name?: string | null
          baseline_hurdle_yield_percent?: number | null
          bio_summary?: string | null
          branch_code?: string | null
          contact_number?: string | null
          created_at?: string | null
          default_agent_commission_percent?: number | null
          default_prime_rate_percent?: number | null
          default_tax_entity_type?: string | null
          email?: string | null
          entity_name?: string | null
          id?: string | null
          liquid_capital_reserve_zar?: number | null
          logo_base64?: string | null
          physical_address?: string | null
          registration_or_id?: string | null
          remittance_instructions?: string | null
          rental_forecast_view?: string | null
          swift_code?: string | null
          trading_as?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          ai_settings?: Json | null
          analyzer_draft?: Json | null
          bank_name?: string | null
          baseline_hurdle_yield_percent?: number | null
          bio_summary?: string | null
          branch_code?: string | null
          contact_number?: string | null
          created_at?: string | null
          default_agent_commission_percent?: number | null
          default_prime_rate_percent?: number | null
          default_tax_entity_type?: string | null
          email?: string | null
          entity_name?: string | null
          id?: string | null
          liquid_capital_reserve_zar?: number | null
          logo_base64?: string | null
          physical_address?: string | null
          registration_or_id?: string | null
          remittance_instructions?: string | null
          rental_forecast_view?: string | null
          swift_code?: string | null
          trading_as?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_tenant_statement: {
        Args: { p_lease_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
