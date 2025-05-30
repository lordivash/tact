import fs from "fs";
import { resolveDescriptors } from "@/types/resolveDescriptors";
import {
    getAllocations,
    resolveAllocations,
} from "@/storage/resolveAllocation";
import { openContext, parseModules } from "@/context/store";
import { resolveStatements } from "@/types/resolveStatements";
import { CompilerContext } from "@/context/context";
import { resolveSignatures } from "@/types/resolveSignatures";
import path from "path";
import { getParser } from "@/grammar";
import { getAstFactory } from "@/ast/ast-helpers";
import { stdlibPath } from "@/stdlib/path";
import type { Source } from "@/imports/source";

const primitivesPath = path.join(stdlibPath, "/std/internal/primitives.tact");
const stdlib = fs.readFileSync(primitivesPath, "utf-8");
const src = `

trait BaseTrait {

}

struct Point3 {
    a: Point;
    b: Point2;
}

struct Point {
    x: Int;
    y: Int;
}

struct Point2 {
    z: Point;
}

struct Deep {
    a: Int;
    b: Int;
    c: Int;
    d: Int;
    e: Int;
    f: Int;
    g: Int;
    h: Int;
    i: Int;
    j: Int;
    k: Int;
}

struct Deep2 {
    a: Deep;
    b: Deep;
    c: Deep;
}

contract Sample {
    v: Int = 0;
    init() {

    }
    fun main(a: Int, b: Int) {
    }
}
`;

describe("resolveAllocation", () => {
    it("should write program", () => {
        const ast = getAstFactory();
        const sources: Source[] = [
            { code: stdlib, path: primitivesPath, origin: "stdlib" },
            { code: src, path: "<unknown>", origin: "user" },
        ];
        let ctx = openContext(
            new CompilerContext(),
            sources,
            [],
            parseModules(sources, getParser(ast)),
        );
        ctx = resolveDescriptors(ctx, ast);
        ctx = resolveSignatures(ctx, ast);
        ctx = resolveStatements(ctx);
        ctx = resolveAllocations(ctx);
        expect(getAllocations(ctx)).toMatchSnapshot();
    });
});
