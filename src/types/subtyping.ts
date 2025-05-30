import type { TypeRef } from "@/types/types";

export function isAssignable(src: TypeRef, to: TypeRef): boolean {
    // If both are refs
    if (src.kind === "ref" && to.kind === "ref") {
        // Cannot assign optional to non-optional
        if (!to.optional && src.optional) {
            return false;
        }

        // Check types
        return src.name === to.name;
    }

    // If both are maps
    if (src.kind === "map" && to.kind === "map") {
        return (
            src.key === to.key &&
            src.value === to.value &&
            isCompatibleAsType(src.key, src.keyAs, to.keyAs) &&
            isCompatibleAsType(src.value, src.valueAs, to.valueAs)
        );
    }

    // Bounced types
    if (src.kind === "ref_bounced" && to.kind === "ref_bounced") {
        return src.name === to.name;
    }

    // Allow assigning null to map
    if (src.kind === "null" && to.kind === "map") {
        return true;
    }

    if (src.kind === "void" && to.kind === "void") {
        return true;
    }

    // Check null
    if (src.kind === "null" && to.kind === "ref") {
        return to.optional;
    }
    if (src.kind === "null" && to.kind === "null") {
        return true;
    }

    // All other options are not assignable
    return false;
}

const EQUIVALENCES_BY_TYPE: Record<string, [string, string][]> = {
    Int: [
        ["", "int257"],
        ["coins", "varuint16"],
    ],
};

/**
 * Checks compatibility of 'as' types, considering equivalences for certain type names.
 * If no equivalences are defined for the typeName, falls back to strict equality.
 * Treats null as an empty string for comparison.
 */
function isCompatibleAsType(
    typeName: string,
    a: string | null,
    b: string | null,
): boolean {
    if (a === b) return true;

    const aNorm = a ?? "";
    const bNorm = b ?? "";

    const equivalents = EQUIVALENCES_BY_TYPE[typeName];
    if (!equivalents) {
        return aNorm === bNorm;
    }

    return equivalents.some(
        ([x, y]) =>
            (aNorm === x && bNorm === y) || (aNorm === y && bNorm === x),
    );
}

export function moreGeneralType(
    type1: TypeRef,
    type2: TypeRef,
): TypeRef | null {
    // This takes care of sub-typing for optionals and maps/null
    if (isAssignable(type1, type2)) return type2;
    if (isAssignable(type2, type1)) return type1;
    // generalize to a more general optional type
    // if we have a non-optional and null types
    if (type1.kind === "ref" && !type1.optional && type2.kind === "null") {
        return { ...type1, optional: true };
    }
    if (type2.kind === "ref" && !type2.optional && type1.kind === "null") {
        return { ...type2, optional: true };
    }
    return null;
}
