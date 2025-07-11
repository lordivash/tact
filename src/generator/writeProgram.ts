import type { CompilerContext } from "@/context/context";
import { getAllocation, getSortedTypes } from "@/storage/resolveAllocation";
import {
    getAllStaticConstants,
    getAllStaticFunctions,
    getAllTypes,
    toBounced,
} from "@/types/resolveDescriptors";
import type { WrittenFunction } from "@/generator/Writer";
import { WriterContext } from "@/generator/Writer";
import {
    writeBouncedParser,
    writeOptionalParser,
    writeOptionalSerializer,
    writeParser,
    writeSerializer,
} from "@/generator/writers/writeSerialization";
import { writeStdlib } from "@/generator/writers/writeStdlib";
import { writeAccessors } from "@/generator/writers/writeAccessors";
import type { ContractABI } from "@ton/core";
import { writeFunction } from "@/generator/writers/writeFunction";
import { calculateIPFSlink } from "@/utils/calculateIPFSlink";
import { getRawAST } from "@/context/store";
import { emit } from "@/generator/emitter/emit";
import {
    writeInit,
    writeMainContract,
    writeContractStorageOps,
} from "@/generator/writers/writeContract";
import { funcInitIdOf } from "@/generator/writers/id";
import { idToHex } from "@/utils/idToHex";
import type { ContractsCodes } from "@/generator/writers/writeContract";
import { writeTypescriptValue } from "@/generator/writers/writeExpression";
import type { TypeDescription } from "@/types/types";

export async function writeProgram(
    ctx: CompilerContext,
    contract: TypeDescription,
    abiSrc: ContractABI,
    basename: string,
    contractCodes: Readonly<ContractsCodes>,
    debug: boolean,
) {
    //
    // Load ABI (required for generator)
    //

    const abi = JSON.stringify(abiSrc);
    const abiLink = await calculateIPFSlink(Buffer.from(abi));

    //
    // Render contract
    //

    const wCtx = new WriterContext(ctx, abiSrc.name!);
    writeAll(ctx, wCtx, abiSrc.name!, abiLink, contractCodes);
    const functions = wCtx.extract(debug);

    //
    // Emit files
    //

    const constants = getAllStaticConstants(ctx)
        .filter((it) => it.loc.origin === "user")
        .map((it) => ({
            name: it.name,
            value: writeTypescriptValue(ctx, it.value, it.type, it.loc),
            fromContract: false,
        }));

    const files: { name: string; code: string }[] = [];
    const imported: string[] = [];

    //
    // Headers
    //

    const headers: string[] = [];
    headers.push(`;;`);
    headers.push(`;; Header files for ${abiSrc.name}`);
    headers.push(`;; NOTE: declarations are sorted for optimal order`);
    headers.push(`;;`);
    headers.push(``);
    // const sortedHeaders = [...functions].sort((a, b) => a.name.localeCompare(b.name));
    for (const f of functions) {
        if (f.code.kind === "generic" && f.signature) {
            headers.push(`;; ${f.name}`);
            let sig = f.signature;
            if (f.flags.has("impure")) {
                sig = sig + " impure";
            }
            if (f.flags.has("inline")) {
                sig = sig + " inline";
            } else {
                sig = sig + " inline_ref";
            }
            headers.push(sig + ";");
            headers.push("");
        }
    }
    files.push({
        name: basename + ".headers.fc",
        code: headers.join("\n"),
    });

    //
    // stdlib
    //

    const globalVariables: string[] = [];

    if (contract.globalVariables.has("context")) {
        globalVariables.push("global (int, slice, int, slice) __tact_context;");
    }
    if (contract.globalVariables.has("sender")) {
        globalVariables.push("global slice __tact_context_sender;");
    }

    globalVariables.push("global cell __tact_child_contract_codes;");
    globalVariables.push("global int __tact_randomized;");

    if (contract.globalVariables.has("inMsg")) {
        globalVariables.push("global slice __tact_in_msg;");
    }

    const stdlibHeader = globalVariables.join("\n");

    const stdlibFunctions = tryExtractModule(functions, "stdlib", []);
    if (stdlibFunctions) {
        imported.push("stdlib");
    }

    const stdlib = emit({
        header: stdlibHeader,
        functions: stdlibFunctions,
    });

    files.push({
        name: basename + ".stdlib.fc",
        code: stdlib,
    });

    //
    // native
    //

    const nativeSources = getRawAST(ctx).funcSources;
    if (nativeSources.length > 0) {
        imported.push("native");
        files.push({
            name: basename + ".native.fc",
            code: emit({
                header: [...nativeSources.map((v) => v.code)].join("\n\n"),
            }),
        });
    }

    //
    // constants
    //

    const constantsFunctions = tryExtractModule(
        functions,
        "constants",
        imported,
    );
    if (constantsFunctions) {
        imported.push("constants");
        files.push({
            name: basename + ".constants.fc",
            code: emit({ functions: constantsFunctions }),
        });
    }

    //
    // storage
    //

    const emittedTypes: string[] = [];
    const types = getSortedTypes(ctx);
    for (const t of types) {
        const ffs: WrittenFunction[] = [];
        if (t.kind === "struct" || t.kind === "contract" || t.kind == "trait") {
            const typeFunctions = tryExtractModule(
                functions,
                "type:" + t.name,
                imported,
            );
            if (typeFunctions) {
                imported.push("type:" + t.name);
                ffs.push(...typeFunctions);
            }
        }
        if (t.kind === "contract") {
            const typeFunctions = tryExtractModule(
                functions,
                "type:" + t.name + "$init",
                imported,
            );
            if (typeFunctions) {
                imported.push("type:" + t.name + "$init");
                ffs.push(...typeFunctions);
            }

            constants.push(
                ...t.constants.map((it) => ({
                    name: it.name,
                    value: writeTypescriptValue(ctx, it.value, it.type, it.loc),
                    fromContract: true,
                })),
            );
        }
        if (ffs.length > 0) {
            const header: string[] = [];
            header.push(";;");
            header.push(`;; Type: ${t.name}`);
            if (t.header !== null) {
                header.push(`;; Header: 0x${idToHex(Number(t.header.value))}`);
            }
            if (t.tlb) {
                header.push(`;; TLB: ${t.tlb}`);
            }
            header.push(";;");

            emittedTypes.push(
                emit({
                    functions: ffs,
                    header: header.join("\n"),
                }),
            );
        }
    }
    if (emittedTypes.length > 0) {
        files.push({
            name: basename + ".storage.fc",
            code: [...emittedTypes].join("\n\n"),
        });
    }

    // const storageFunctions = tryExtractModule(functions, 'storage', imported);
    // if (storageFunctions) {
    //     imported.push('storage');
    //     files.push({
    //         name: basename + '.storage.fc',
    //         code: emit({ functions: storageFunctions })
    //     });
    // }

    //
    // Remaining
    //

    const remainingFunctions = tryExtractModule(functions, null, imported);
    const header: string[] = [];
    header.push("#pragma version =0.4.6;");
    header.push("#pragma allow-post-modification;");
    header.push("#pragma compute-asm-ltr;");

    files.forEach((file) => {
        header.push("");
        header.push(`;; ${file.name}`);
        header.push(file.code);
    });

    header.push("");
    header.push(";;");
    header.push(`;; Contract ${abiSrc.name} functions`);
    header.push(";;");
    header.push("");
    const code = emit({
        header: header.join("\n"),
        functions: remainingFunctions,
    });

    return {
        entrypoint: `${basename}.fc`,
        funcFile: { name: `${basename}.fc`, code },
        constants,
        abi,
    };
}

function tryExtractModule(
    functions: WrittenFunction[],
    context: string | null,
    imported: string[],
): WrittenFunction[] | null {
    // Put to map
    const maps: Map<string, WrittenFunction> = new Map();
    for (const f of functions) {
        maps.set(f.name, f);
    }

    // Extract functions of a context
    const ctxFunctions: WrittenFunction[] = functions
        .filter((v) => v.code.kind !== "skip")
        .filter((v) => {
            if (context) {
                return v.context === context;
            } else {
                return v.context === null || !imported.includes(v.context);
            }
        });
    if (ctxFunctions.length === 0) {
        return null;
    }

    // Check dependencies
    // if (context) {
    //     for (let f of ctxFunctions) {
    //         for (let d of f.depends) {
    //             let c = maps.get(d)!.context;
    //             if (!c) {
    //                 console.warn(`Function ${f.name} depends on ${d} with generic context, but ${context} is needed`);
    //                 return null; // Found dependency to unknown function
    //             }
    //             if (c !== context && (c !== null && !imported.includes(c))) {
    //                 console.warn(`Function ${f.name} depends on ${d} with ${c} context, but ${context} is needed`);
    //                 return null; // Found dependency to another context
    //             }
    //         }
    //     }
    // }

    return ctxFunctions;
}

function writeAll(
    ctx: CompilerContext,
    wCtx: WriterContext,
    name: string,
    abiLink: string,
    contractCodes: Readonly<ContractsCodes>,
) {
    // Load all types
    const allTypes = getAllTypes(ctx);
    const contracts = allTypes.filter((v) => v.kind === "contract");
    const c = contracts.find((v) => v.name === name);
    if (!c) {
        throw Error(`Contract "${name}" not found`);
    }

    // Stdlib
    writeStdlib(wCtx);

    // Serializers
    const sortedTypes = getSortedTypes(ctx);
    for (const t of sortedTypes) {
        if (t.kind === "contract" || t.kind === "struct") {
            const allocation = getAllocation(ctx, t.name);
            const allocationBounced = getAllocation(ctx, toBounced(t.name));
            writeSerializer(
                t.name,
                t.kind === "contract",
                allocation,
                t.origin,
                wCtx,
            );
            writeOptionalSerializer(t.name, t.origin, wCtx);
            writeParser(
                t,
                t.name,
                t.kind === "contract",
                "with-opcode",
                allocation,
                wCtx,
            );
            writeParser(
                t,
                t.name,
                t.kind === "contract",
                "no-opcode",
                allocation,
                wCtx,
            );
            writeOptionalParser(t.name, t.origin, wCtx);
            writeBouncedParser(t, allocationBounced, wCtx);
        }
    }

    // Accessors
    for (const t of allTypes) {
        if (t.kind === "contract" || t.kind === "struct") {
            writeAccessors(t, t.origin, wCtx);
        }
    }

    // Init serializers
    for (const t of sortedTypes) {
        if (t.kind === "contract" && t.init) {
            const allocation = getAllocation(ctx, funcInitIdOf(t.name));
            writeSerializer(
                funcInitIdOf(t.name),
                true,
                allocation,
                t.origin,
                wCtx,
            );
            writeParser(
                t,
                funcInitIdOf(t.name),
                false,
                "with-opcode",
                allocation,
                wCtx,
            );
        }
    }

    // Storage Functions
    for (const t of sortedTypes) {
        if (t.kind === "contract") {
            writeContractStorageOps(t, wCtx);
        }
    }

    // Static functions
    getAllStaticFunctions(ctx).forEach((f) => {
        writeFunction(f, wCtx);
    });

    // Extensions
    for (const c of allTypes) {
        if (c.kind !== "contract" && c.kind !== "trait") {
            // We are rendering contract functions separately
            for (const f of c.functions.values()) {
                writeFunction(f, wCtx);
            }
        }
    }

    // Contract functions
    for (const c of contracts) {
        // Init
        if (c.init) {
            writeInit(c, c.init, wCtx, contractCodes);
        }

        // Functions
        for (const f of c.functions.values()) {
            writeFunction(f, wCtx);
        }
    }

    // Write contract main
    writeMainContract(c, abiLink, wCtx);
}
