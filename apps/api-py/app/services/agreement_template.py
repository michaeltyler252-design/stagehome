"""Direct port of agreements/agreement-template.ts."""

import re
from typing import TypedDict


class HouseRuleContext(TypedDict):
    rule_type: str
    detail: str | None


class AgreementContext(TypedDict):
    tenant_name: str
    manager_organisation_name: str
    property_title: str
    property_address: str
    unit_label: str
    agreed_rent: str
    agreed_deposit: str
    move_in_date: str
    house_rules: list[HouseRuleContext]


def render_default_agreement(ctx: AgreementContext) -> str:
    """Renders the tenancy agreement body. Uses the organisation's own
    tenancy_templates/tenancy_template_versions when one exists (falls
    back to this built-in default otherwise) — not yet wired up to that
    lookup here (see MIGRATION.md), matching a real limitation the
    original itself documents as future work in the calling service, not
    this renderer."""
    if ctx["house_rules"]:
        rules_list = "\n".join(
            f"- **{r['rule_type'].replace('_', ' ')}:** {r['detail'] or 'Information Required'}"
            for r in ctx["house_rules"]
        )
    else:
        rules_list = "- Information Required"

    return f"""# Tenancy Agreement

**Property:** {ctx['property_title']}
**Address:** {ctx['property_address']}
**Unit:** {ctx['unit_label']}
**Tenant:** {ctx['tenant_name']}
**Manager:** {ctx['manager_organisation_name']}

## Terms

- **Monthly rent:** {ctx['agreed_rent']}
- **Deposit:** {ctx['agreed_deposit']}
- **Move-in date:** {ctx['move_in_date']}

## House rules

{rules_list}

## Signatures

This agreement becomes binding once both the tenant and the manager have
signed via their individually issued, authenticated signing links. Neither
party's price or policy terms above may be altered after signing without
issuing a new agreement version.
"""


def render_template(template: str, ctx: dict[str, str]) -> str:
    return re.sub(r"\{\{(\w+)\}\}", lambda m: ctx.get(m.group(1), "Information Required"), template)
