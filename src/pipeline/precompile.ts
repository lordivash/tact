import type { CompilerContext } from "@/context/context";
import {
    computeGlobalVariablesUsages,
    resolveDescriptors,
} from "@/types/resolveDescriptors";
import { resolveAllocations } from "@/storage/resolveAllocation";
import { openContext, parseModules } from "@/context/store";
import { resolveStatements } from "@/types/resolveStatements";
import { resolveErrors } from "@/types/resolveErrors";
import { resolveSignatures } from "@/types/resolveSignatures";
import { resolveImports } from "@/imports/resolveImports";
import type { VirtualFileSystem } from "@/vfs/VirtualFileSystem";
import type * as Ast from "@/ast/ast";
import { getAstFactory } from "@/ast/ast-helpers";
import { getParser } from "@/grammar";
import { evalComptimeExpressions } from "@/types/evalComptimeExpressions";
import { computeReceiversEffects } from "@/types/effects";
import { setAstFactoryToStore } from "@/pipeline/ast-factory-store";

export function precompile(
    ctx: CompilerContext,
    project: VirtualFileSystem,
    stdlib: VirtualFileSystem,
    entrypoint: string,
    parsedModules?: Ast.Module[],
) {
    const ast = getAstFactory();
    setAstFactoryToStore(ctx, ast);

    const parser = getParser(ast);

    // Load all sources
    const imported = resolveImports({ entrypoint, project, stdlib, parser });

    // Parse the sources and attach the given parsed modules
    const modules = [
        ...parseModules(imported.tact, parser),
        ...(parsedModules ?? []),
    ];

    // Add information about all the source code entries to the context
    ctx = openContext(ctx, imported.tact, imported.func, modules);

    // First load type descriptors and check that
    //       they all have valid signatures
    ctx = resolveDescriptors(ctx, ast);

    // This checks and resolves all statements
    ctx = resolveStatements(ctx);

    // From this point onwards, it is safe to call evalConstantExpression.

    /* Evaluate all comp-time expressions:
       constants, default contract fields, default struct fields, method Ids

       The original code inside constant, field and method id initialization actually mutated the CompilerContext object,
       while the rest of the typechecker's code built a new CompilerContext every time it changed something.
       Hence the reason of why this line is not written as:

       ctx = evalComptimeExpressions(ctx, ast);

       The code mutates fields in ConstantDescription, FieldDescription and FunctionDescription.

       Evaluation of Message op-codes is done later in resolveSignatures. It was left there because
       the computation of those op-codes is more involved than the computation of method ids, and so
       it is hard to extract the call to evalConstantExpression in resolveSignatures.
    */
    evalComptimeExpressions(ctx, ast);

    ctx = computeGlobalVariablesUsages(ctx);

    // This creates TLB-style type definitions
    ctx = resolveSignatures(ctx, ast);

    // This extracts error messages
    ctx = resolveErrors(ctx, ast);

    // This creates allocations for all defined types
    ctx = resolveAllocations(ctx);

    // To use in code generation to decide if a receiver needs to call the contract storage function
    computeReceiversEffects(ctx);

    // Prepared context
    return ctx;
}
