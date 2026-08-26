import type { ExportOrganization, UseCaseLinkRef } from '../types/use-case.js';

function linkLabel(link: UseCaseLinkRef): string {
  return String(link.labelRaw || '').trim();
}

/**
 * orgId for a community-catalog folder must be the listing organisation
 * (`organizationName` / folder slug), not `links.organizations[0]`.
 * That first-row shortcut assigned Hopae → org:google after partner links
 * were resolved to catalog refs.
 */
export function listingOrgId(org: ExportOrganization): string {
  const orgName = String(org.orgName || '').trim();
  const names = new Set<string>();
  if (orgName) names.add(orgName.toLowerCase());
  for (const uc of org.useCases || []) {
    const n = String(uc.organizationName || '').trim();
    if (n) names.add(n.toLowerCase());
  }

  for (const uc of org.useCases || []) {
    const links = uc.links?.organizations || [];
    for (const link of links) {
      if (!link || typeof link !== 'object') continue;
      const ref = String(link.refId || '').trim();
      const label = linkLabel(link);
      if (ref && label && names.has(label.toLowerCase())) {
        return ref;
      }
    }
  }

  const slug = String(org.orgSlug || '').trim();
  const expected = slug !== '' ? `org:${slug}` : '';
  if (expected) {
    for (const uc of org.useCases || []) {
      const links = uc.links?.organizations || [];
      for (const link of links) {
        if (String(link?.refId || '').trim() === expected) {
          return expected;
        }
      }
    }
    return expected;
  }

  const fallback = String(org.orgId || '').trim();
  return fallback || 'org:unknown-organization';
}
