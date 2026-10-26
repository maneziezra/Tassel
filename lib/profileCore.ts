// Tassel — how the profile shown on screen is put together (pure, testable).
//
// P0.1 bug: the name typed at sign-up disappeared from Profile when the farmer
// came back. The name can live in three places: the `profiles` row, the auth
// user's metadata (written at sign-up) and the copy cached on the phone. A
// missing or blank value in one must never hide a value held in another.

export type ProfileFields = {
  id: string;
  name: string | null;
  phone: string | null;
  county: string | null;
  crops: string | null;
  created_at?: string;
};

const pick = (...vals: Array<string | null | undefined>) => vals.map((v) => v?.trim()).find((v) => !!v) ?? null;

/** Server row first, then the auth metadata name, then the phone's cached copy. */
export function resolveProfile(
  id: string,
  remote: Partial<ProfileFields> | null | undefined,
  authName: string | null | undefined,
  cached: Partial<ProfileFields> | null | undefined
): ProfileFields {
  return {
    id,
    name: pick(remote?.name, authName, cached?.name),
    phone: pick(remote?.phone, cached?.phone),
    county: pick(remote?.county, cached?.county),
    crops: pick(remote?.crops, cached?.crops),
    created_at: remote?.created_at ?? cached?.created_at,
  };
}

/** True when the server row is missing a name we know, so it should be written back. */
export function needsNameBackfill(remote: Partial<ProfileFields> | null | undefined, resolved: ProfileFields): boolean {
  return !remote?.name?.trim() && !!resolved.name;
}
