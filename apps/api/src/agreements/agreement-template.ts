interface AgreementContext {
  tenantName: string;
  managerOrganisationName: string;
  propertyTitle: string;
  propertyAddress: string;
  unitLabel: string;
  agreedRent: string;
  agreedDeposit: string;
  moveInDate: string;
  houseRules: Array<{ ruleType: string; detail: string | null }>;
}

/**
 * Renders the tenancy agreement body. Uses the organisation's own
 * `tenancy_templates` / `tenancy_template_versions` when one exists
 * (`{{placeholder}}` substitution against a manager-authored Markdown
 * template); falls back to this built-in default otherwise, so Milestone 9
 * works end-to-end before any organisation has authored a custom template.
 */
export function renderDefaultAgreement(ctx: AgreementContext): string {
  const rulesList = ctx.houseRules.length
    ? ctx.houseRules
        .map((r) => `- **${r.ruleType.replace(/_/g, " ")}:** ${r.detail ?? "Information Required"}`)
        .join("\n")
    : "- Information Required";

  return `# Tenancy Agreement

**Property:** ${ctx.propertyTitle}
**Address:** ${ctx.propertyAddress}
**Unit:** ${ctx.unitLabel}
**Tenant:** ${ctx.tenantName}
**Manager:** ${ctx.managerOrganisationName}

## Terms

- **Monthly rent:** ${ctx.agreedRent}
- **Deposit:** ${ctx.agreedDeposit}
- **Move-in date:** ${ctx.moveInDate}

## House rules

${rulesList}

## Signatures

This agreement becomes binding once both the tenant and the manager have
signed via their individually issued, authenticated signing links. Neither
party's price or policy terms above may be altered after signing without
issuing a new agreement version.
`;
}

export function renderTemplate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => ctx[key] ?? "Information Required");
}
