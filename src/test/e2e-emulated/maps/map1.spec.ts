/* eslint-disable @typescript-eslint/no-explicit-any */

import { randomAddress } from "@/test/utils/random-utils";
import type {
    MapTestContract$Data,
    SetAllMaps,
    DelAllMaps,
    SomeStruct,
    ReplaceAllMaps,
    ReplaceGetAllMaps,
} from "./output/maps1_MapTestContract";
import { MapTestContract } from "./output/maps1_MapTestContract";
import type { SandboxContract, TreasuryContract } from "@ton/sandbox";
import { Blockchain } from "@ton/sandbox";
import { Address, beginCell, Cell, Dictionary, toNano } from "@ton/core";
import "@ton/test-utils";

// Type Guard for SomeStruct
function isSomeStruct(value: unknown): value is SomeStruct {
    return (
        typeof value === "object" &&
        value !== null &&
        "$$type" in value &&
        (value as { $$type: string }).$$type === "SomeStruct" &&
        "int" in value &&
        "bool" in value &&
        "address" in value &&
        "a" in value &&
        "b" in value &&
        typeof (value as any).int === "bigint" &&
        typeof (value as any).bool === "boolean" &&
        (value as any).address instanceof Address &&
        typeof (value as any).a === "bigint" &&
        typeof (value as any).b === "bigint"
    );
}

// Comparator for SomeStruct
function compareStructs(a: SomeStruct, b: SomeStruct): boolean {
    return (
        a.int === b.int &&
        a.bool === b.bool &&
        a.address.equals(b.address) &&
        a.a === b.a &&
        a.b === b.b
    );
}

// Type definitions for keys and values to make them type-safe
type TestKeys = {
    keyInt: bigint;
    keyInt8: bigint;
    keyInt42: bigint;
    keyInt256: bigint;
    keyUint8: bigint;
    keyUint42: bigint;
    keyUint256: bigint;
    keyAddress: Address;
};

type TestValues = {
    valueVarint16: bigint;
    valueVarint32: bigint;
    valueVaruint16: bigint;
    valueVaruint32: bigint;
    valueBool: boolean;
    valueCell: Cell;
    valueAddress: Address;
    valueStruct: SomeStruct;
};

// Configuration for all maps
type MapConfig = {
    mapName: keyof MapTestContract$Data;
    key: keyof TestKeys;
    value: keyof TestValues;
    keyTransform?: (key: any) => any;
    valueTransform?: (value: any) => any;
};

type TestCase = {
    keys: TestKeys;
    values: TestValues;
};

const testCases: TestCase[] = [
    {
        keys: {
            keyInt: 123n,
            keyInt8: -10n,
            keyInt42: 42n,
            keyInt256: 456n,
            keyUint8: 200n,
            keyUint42: 500_000n,
            keyUint256: 1_000_000_000_000n,
            keyAddress: randomAddress(0, "address0"),
        },
        values: {
            valueVarint16: 123n,
            valueVarint32: 123_456n,
            valueVaruint16: 255n,
            valueVaruint32: 123_456_789n,
            valueBool: true,
            valueCell: beginCell().storeUint(42, 32).endCell(),
            valueAddress: randomAddress(0, "address"),
            valueStruct: {
                $$type: "SomeStruct",
                int: 321n,
                bool: false,
                address: randomAddress(0, "address"),
                a: 10n,
                b: -20n,
            } as SomeStruct,
        },
    },
    {
        keys: {
            keyInt: -(2n ** 31n), // Min 32-bit signed int
            keyInt8: -128n, // Min 8-bit signed int
            keyInt42: -(2n ** 41n), // Min 42-bit signed int
            keyInt256: -(2n ** 255n), // Min 256-bit signed int
            keyUint8: 255n, // Max 8-bit unsigned int
            keyUint42: 2n ** 42n - 1n, // Max 42-bit unsigned int
            keyUint256: 2n ** 256n - 1n, // Max 256-bit unsigned int
            keyAddress: randomAddress(0, "address1"),
        },
        values: {
            valueVarint16: -(2n ** 118n), // Min VarInt16
            valueVarint32: -(2n ** 246n), // Min VarInt32
            valueVaruint16: 2n ** 120n - 1n, // Max VarUint16
            valueVaruint32: 2n ** 248n - 1n, // Max VarUint32
            valueBool: false,
            valueCell: beginCell()
                .storeUint(2n ** 32n - 1n, 32)
                .endCell(),
            valueAddress: randomAddress(0, "address"),
            valueStruct: {
                $$type: "SomeStruct",
                int: -(2n ** 31n), // Min 32-bit signed int
                bool: true,
                address: randomAddress(0, "address"),
                a: 2n ** 41n - 1n, // Max 42-bit signed int
                b: -(2n ** 41n), // Min 42-bit signed int
            } as SomeStruct,
        },
    },
    {
        keys: {
            keyInt: 0n,
            keyInt8: 0n,
            keyInt42: 0n,
            keyInt256: 0n,
            keyUint8: 0n,
            keyUint42: 0n,
            keyUint256: 0n,
            keyAddress: randomAddress(0, "address2"),
        },
        values: {
            valueVarint16: -1n,
            valueVarint32: -1n,
            valueVaruint16: 1n,
            valueVaruint32: 1n,
            valueBool: false,
            valueCell: beginCell().storeUint(0, 32).endCell(),
            valueAddress: randomAddress(0, "address"),
            valueStruct: {
                $$type: "SomeStruct",
                int: 0n,
                bool: false,
                address: randomAddress(0, "address"),
                a: 0n,
                b: 0n,
            } as SomeStruct,
        },
    },
    {
        keys: {
            keyInt: 1n,
            keyInt8: -1n,
            keyInt42: 424n,
            keyInt256: 2n ** 128n, // Large but not maximum value
            keyUint8: 128n, // Middle value
            keyUint42: 2n ** 41n, // Large power of 2
            keyUint256: 2n ** 128n, // Large power of 2
            keyAddress: randomAddress(0, "address3"),
        },
        values: {
            valueVarint16: 2n ** 41n,
            valueVarint32: -(2n ** 123n),
            valueVaruint16: 2n ** 41n,
            valueVaruint32: 2n ** 123n,
            valueBool: true,
            valueCell: beginCell()
                .storeUint(2n ** 31n, 32)
                .endCell(),
            valueAddress: randomAddress(0, "address"),
            valueStruct: {
                $$type: "SomeStruct",
                int: -42n, // Special number
                bool: true,
                address: randomAddress(0, "address"),
                a: 2n ** 40n, // Large power of 2
                b: -(2n ** 40n), // Large negative power of 2
            } as SomeStruct,
        },
    },
];

// Define all 88 map configurations
const mapConfigs: MapConfig[] = [
    // int_* Maps
    { mapName: "int_varint16", key: "keyInt", value: "valueVarint16" },
    { mapName: "int_varint32", key: "keyInt", value: "valueVarint32" },
    { mapName: "int_varuint16", key: "keyInt", value: "valueVaruint16" },
    { mapName: "int_varuint32", key: "keyInt", value: "valueVaruint32" },
    { mapName: "int_bool", key: "keyInt", value: "valueBool" },
    { mapName: "int_cell", key: "keyInt", value: "valueCell" },
    { mapName: "int_address", key: "keyInt", value: "valueAddress" },
    { mapName: "int_struct", key: "keyInt", value: "valueStruct" },

    // int8_* Maps
    {
        mapName: "int8_varint16",
        key: "keyInt8",
        value: "valueVarint16",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_varint32",
        key: "keyInt8",
        value: "valueVarint32",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_varuint16",
        key: "keyInt8",
        value: "valueVaruint16",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_varuint32",
        key: "keyInt8",
        value: "valueVaruint32",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_bool",
        key: "keyInt8",
        value: "valueBool",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_cell",
        key: "keyInt8",
        value: "valueCell",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_address",
        key: "keyInt8",
        value: "valueAddress",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "int8_struct",
        key: "keyInt8",
        value: "valueStruct",
        keyTransform: (k: bigint) => Number(k),
    },

    // int42_* Maps
    { mapName: "int42_varint16", key: "keyInt42", value: "valueVarint16" },
    { mapName: "int42_varint32", key: "keyInt42", value: "valueVarint32" },
    { mapName: "int42_varuint16", key: "keyInt42", value: "valueVaruint16" },
    { mapName: "int42_varuint32", key: "keyInt42", value: "valueVaruint32" },
    { mapName: "int42_bool", key: "keyInt42", value: "valueBool" },
    { mapName: "int42_cell", key: "keyInt42", value: "valueCell" },
    { mapName: "int42_address", key: "keyInt42", value: "valueAddress" },
    { mapName: "int42_struct", key: "keyInt42", value: "valueStruct" },

    // int256_* Maps
    { mapName: "int256_varint16", key: "keyInt256", value: "valueVarint16" },
    { mapName: "int256_varint32", key: "keyInt256", value: "valueVarint32" },
    { mapName: "int256_varuint16", key: "keyInt256", value: "valueVaruint16" },
    { mapName: "int256_varuint32", key: "keyInt256", value: "valueVaruint32" },
    { mapName: "int256_bool", key: "keyInt256", value: "valueBool" },
    { mapName: "int256_cell", key: "keyInt256", value: "valueCell" },
    { mapName: "int256_address", key: "keyInt256", value: "valueAddress" },
    { mapName: "int256_struct", key: "keyInt256", value: "valueStruct" },

    // uint8_* Maps
    {
        mapName: "uint8_varint16",
        key: "keyUint8",
        value: "valueVarint16",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_varint32",
        key: "keyUint8",
        value: "valueVarint32",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_varuint16",
        key: "keyUint8",
        value: "valueVaruint16",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_varuint32",
        key: "keyUint8",
        value: "valueVaruint32",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_bool",
        key: "keyUint8",
        value: "valueBool",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_cell",
        key: "keyUint8",
        value: "valueCell",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_address",
        key: "keyUint8",
        value: "valueAddress",
        keyTransform: (k: bigint) => Number(k),
    },
    {
        mapName: "uint8_struct",
        key: "keyUint8",
        value: "valueStruct",
        keyTransform: (k: bigint) => Number(k),
    },

    // uint42_* Maps
    { mapName: "uint42_varint16", key: "keyUint42", value: "valueVarint16" },
    { mapName: "uint42_varint32", key: "keyUint42", value: "valueVarint32" },
    { mapName: "uint42_varuint16", key: "keyUint42", value: "valueVaruint16" },
    { mapName: "uint42_varuint32", key: "keyUint42", value: "valueVaruint32" },
    { mapName: "uint42_bool", key: "keyUint42", value: "valueBool" },
    { mapName: "uint42_cell", key: "keyUint42", value: "valueCell" },
    { mapName: "uint42_address", key: "keyUint42", value: "valueAddress" },
    { mapName: "uint42_struct", key: "keyUint42", value: "valueStruct" },

    // uint256_* Maps
    { mapName: "uint256_varint16", key: "keyUint256", value: "valueVarint16" },
    { mapName: "uint256_varint32", key: "keyUint256", value: "valueVarint32" },
    {
        mapName: "uint256_varuint16",
        key: "keyUint256",
        value: "valueVaruint16",
    },
    {
        mapName: "uint256_varuint32",
        key: "keyUint256",
        value: "valueVaruint32",
    },
    { mapName: "uint256_bool", key: "keyUint256", value: "valueBool" },
    { mapName: "uint256_cell", key: "keyUint256", value: "valueCell" },
    { mapName: "uint256_address", key: "keyUint256", value: "valueAddress" },
    { mapName: "uint256_struct", key: "keyUint256", value: "valueStruct" },

    // address_* Maps
    { mapName: "address_varint16", key: "keyAddress", value: "valueVarint16" },
    { mapName: "address_varint32", key: "keyAddress", value: "valueVarint32" },
    {
        mapName: "address_varuint16",
        key: "keyAddress",
        value: "valueVaruint16",
    },
    {
        mapName: "address_varuint32",
        key: "keyAddress",
        value: "valueVaruint32",
    },
    { mapName: "address_bool", key: "keyAddress", value: "valueBool" },
    { mapName: "address_cell", key: "keyAddress", value: "valueCell" },
    { mapName: "address_address", key: "keyAddress", value: "valueAddress" },
    { mapName: "address_struct", key: "keyAddress", value: "valueStruct" },
];

describe("MapTestContract", () => {
    let blockchain: Blockchain;
    let treasury: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<MapTestContract>;

    beforeEach(async () => {
        // Initialize the blockchain and contracts
        blockchain = await Blockchain.create();
        blockchain.verbosity.print = false;
        treasury = await blockchain.treasury("treasury");
        contract = blockchain.openContract(await MapTestContract.fromInit());

        // Fund the contract with some TONs
        await contract.send(
            treasury.getSender(),
            { value: toNano("10") },
            null,
        );

        // Check that all maps are empty initially
        const maps = await contract.getAllMaps();
        for (const [_mapName, map] of Object.entries(maps)) {
            if (map instanceof Dictionary) {
                expect(map.size).toBe(0);
            }
        }
    });

    it("set: should set and clear values", async () => {
        for (const { keys, values } of testCases) {
            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Retrieve all maps using `allMaps` getter
            const allMaps = await contract.getAllMaps();

            // Iterate over mapConfigs and perform assertions
            mapConfigs.forEach(
                ({ mapName, key, value, keyTransform, valueTransform }) => {
                    const map = allMaps[mapName] as Dictionary<any, any>;

                    expect(map.size).toBe(1);

                    let mapKey = keys[key];
                    if (keyTransform) {
                        mapKey = keyTransform(mapKey);
                    }

                    let expectedValue = values[value];
                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                    }

                    const actualValue = map.get(mapKey);

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(compareStructs(actualValue, expectedValue)).toBe(
                            true,
                        );
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );

            // Clear all maps by setting values to null
            const clearMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                valueVarint16: null,
                valueVarint32: null,
                valueVaruint16: null,
                valueVaruint32: null,
                valueBool: null,
                valueCell: null,
                valueAddress: null,
                valueStruct: null,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                clearMessage,
            );

            // Retrieve all maps again to ensure they are empty
            const clearedMaps = await contract.getAllMaps();

            // Iterate over mapConfigs and assert maps are empty
            mapConfigs.forEach(({ mapName }) => {
                const map = clearedMaps[mapName] as Dictionary<any, any>;
                expect(map.size).toBe(0);
            });
        }
    });

    it("set: should set multiple values", async () => {
        for (const { keys, values } of testCases) {
            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Retrieve all maps using `allMaps` getter
        const allMaps = await contract.getAllMaps();

        for (const { keys, values } of testCases) {
            // Iterate over mapConfigs and perform assertions
            mapConfigs.forEach(
                ({ mapName, key, value, keyTransform, valueTransform }) => {
                    const map = allMaps[mapName] as Dictionary<any, any>;

                    expect(map.size).toBe(testCases.length);

                    let mapKey = keys[key];
                    if (keyTransform) {
                        mapKey = keyTransform(mapKey);
                    }

                    let expectedValue = values[value];
                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                    }

                    const actualValue = map.get(mapKey);

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(compareStructs(actualValue, expectedValue)).toBe(
                            true,
                        );
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );
        }

        for (const { keys } of testCases) {
            // Clear all maps by setting values to null
            const clearMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                valueVarint16: null,
                valueVarint32: null,
                valueVaruint16: null,
                valueVaruint32: null,
                valueBool: null,
                valueCell: null,
                valueAddress: null,
                valueStruct: null,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                clearMessage,
            );
        }

        // Retrieve all maps again to ensure they are empty
        const clearedMaps = await contract.getAllMaps();

        // Iterate over mapConfigs and assert maps are empty
        mapConfigs.forEach(({ mapName }) => {
            const map = clearedMaps[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(0);
        });
    });

    it("set: should overwrite values", async () => {
        for (const { keys } of testCases) {
            for (const { values } of testCases) {
                // Send the set operation
                const setMessage: SetAllMaps = {
                    $$type: "SetAllMaps",
                    ...keys,
                    ...values,
                };

                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    setMessage,
                );

                // Retrieve all maps using `allMaps` getter
                const allMaps = await contract.getAllMaps();

                // Iterate over mapConfigs and perform assertions
                mapConfigs.forEach(
                    ({ mapName, key, value, keyTransform, valueTransform }) => {
                        const map = allMaps[mapName] as Dictionary<any, any>;

                        expect(map.size).toBe(1);

                        let mapKey = keys[key];
                        if (keyTransform) {
                            mapKey = keyTransform(mapKey);
                        }

                        let expectedValue = values[value];
                        if (valueTransform) {
                            expectedValue = valueTransform(expectedValue);
                        }

                        const actualValue = map.get(mapKey);

                        if (expectedValue instanceof Cell) {
                            expect(actualValue).toEqualCell(expectedValue);
                        } else if (expectedValue instanceof Address) {
                            expect(actualValue).toEqualAddress(expectedValue);
                        } else if (isSomeStruct(expectedValue)) {
                            expect(
                                compareStructs(actualValue, expectedValue),
                            ).toBe(true);
                        } else {
                            expect(actualValue).toEqual(expectedValue);
                        }
                    },
                );
            }

            // Clear all maps by setting values to null
            const clearMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                valueVarint16: null,
                valueVarint32: null,
                valueVaruint16: null,
                valueVaruint32: null,
                valueBool: null,
                valueCell: null,
                valueAddress: null,
                valueStruct: null,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                clearMessage,
            );

            // Retrieve all maps again to ensure they are empty
            const clearedMaps = await contract.getAllMaps();

            // Iterate over mapConfigs and assert maps are empty
            mapConfigs.forEach(({ mapName }) => {
                const map = clearedMaps[mapName] as Dictionary<any, any>;
                expect(map.size).toBe(0);
            });
        }
    });

    it("get: should get values after setting them and nulls after clearing", async () => {
        for (const { keys, values } of testCases) {
            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Call the .get operation on all maps
            const getResponse = await contract.getGetAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
            );

            // Iterate over mapConfigs and perform assertions
            mapConfigs.forEach(
                ({
                    mapName,
                    key: _key,
                    value,
                    keyTransform: _keyTransform,
                    valueTransform,
                }) => {
                    let expectedValue = values[value];
                    let actualValue = getResponse[mapName];

                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                        actualValue = valueTransform(actualValue);
                    }

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(
                            compareStructs(
                                actualValue as SomeStruct,
                                expectedValue,
                            ),
                        ).toBe(true);
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );

            // Clear all maps by setting values to null
            const clearMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                valueVarint16: null,
                valueVarint32: null,
                valueVaruint16: null,
                valueVaruint32: null,
                valueBool: null,
                valueCell: null,
                valueAddress: null,
                valueStruct: null,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                clearMessage,
            );

            // Call the .get operation on all maps again
            const clearedGetResponse = await contract.getGetAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
            );

            // Iterate over mapConfigs and assert maps are empty
            mapConfigs.forEach(({ mapName }) => {
                const actualValue = clearedGetResponse[mapName];
                expect(actualValue).toBeNull();
            });
        }
    });

    it("get: should return null for all maps when no values are set", async () => {
        for (const { keys } of testCases) {
            // Call the .get operation on all maps
            const getResponse = await contract.getGetAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
            );

            // Iterate over mapConfigs and assert that all values are null
            mapConfigs.forEach(({ mapName }) => {
                const actualValue = getResponse[mapName];
                expect(actualValue).toBeNull();
            });
        }
    });

    it("get: should retrieve multiple values after setting them", async () => {
        // Set multiple values
        for (const { keys, values } of testCases) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Now retrieve values for each test case
        for (const { keys, values } of testCases) {
            // Call the .get operation on all maps
            const getResponse = await contract.getGetAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
            );

            // Iterate over mapConfigs and perform assertions
            mapConfigs.forEach(
                ({
                    mapName,
                    key: _key,
                    value,
                    keyTransform: _keyTransform,
                    valueTransform,
                }) => {
                    let expectedValue = values[value];
                    let actualValue = getResponse[mapName];

                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                        actualValue = valueTransform(actualValue);
                    }

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(
                            compareStructs(
                                actualValue as SomeStruct,
                                expectedValue,
                            ),
                        ).toBe(true);
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );
        }
    });

    it("get: should retrieve updated values after overwriting", async () => {
        for (const { keys } of testCases) {
            for (const { values } of testCases) {
                // Send the set operation
                const setMessage: SetAllMaps = {
                    $$type: "SetAllMaps",
                    ...keys,
                    ...values,
                };

                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    setMessage,
                );

                // Call the .get operation on all maps
                const getResponse = await contract.getGetAllMaps(
                    keys.keyInt,
                    keys.keyInt8,
                    keys.keyInt42,
                    keys.keyInt256,
                    keys.keyUint8,
                    keys.keyUint42,
                    keys.keyUint256,
                    keys.keyAddress,
                );

                // Iterate over mapConfigs and perform assertions
                mapConfigs.forEach(
                    ({
                        mapName,
                        key: _key,
                        value,
                        keyTransform: _keyTransform,
                        valueTransform,
                    }) => {
                        let expectedValue = values[value];
                        let actualValue = getResponse[mapName];

                        if (valueTransform) {
                            expectedValue = valueTransform(expectedValue);
                            actualValue = valueTransform(actualValue);
                        }

                        if (expectedValue instanceof Cell) {
                            expect(actualValue).toEqualCell(expectedValue);
                        } else if (expectedValue instanceof Address) {
                            expect(actualValue).toEqualAddress(expectedValue);
                        } else if (isSomeStruct(expectedValue)) {
                            expect(
                                compareStructs(
                                    actualValue as SomeStruct,
                                    expectedValue,
                                ),
                            ).toBe(true);
                        } else {
                            expect(actualValue).toEqual(expectedValue);
                        }
                    },
                );
            }
        }
    });

    it("get: should return null for non-existent keys", async () => {
        // First, set some keys
        for (const { keys, values } of testCases.slice(0, -1)) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Now, attempt to get values for keys that have not been set
        const nonExistentKeys = testCases[testCases.length - 1]!.keys;

        const getResponse = await contract.getGetAllMaps(
            nonExistentKeys.keyInt,
            nonExistentKeys.keyInt8,
            nonExistentKeys.keyInt42,
            nonExistentKeys.keyInt256,
            nonExistentKeys.keyUint8,
            nonExistentKeys.keyUint42,
            nonExistentKeys.keyUint256,
            nonExistentKeys.keyAddress,
        );

        // Iterate over mapConfigs and assert that values are null
        mapConfigs.forEach(({ mapName }) => {
            const actualValue = getResponse[mapName];
            expect(actualValue).toBeNull();
        });
    });

    it("del: should delete values", async () => {
        for (const { keys, values } of testCases) {
            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Retrieve all maps using `allMaps` getter to ensure they are set
            const allMapsBeforeDel = await contract.getAllMaps();

            // Iterate over mapConfigs and verify all maps have one entry
            mapConfigs.forEach(
                ({ mapName, key, value, keyTransform, valueTransform }) => {
                    const map = allMapsBeforeDel[mapName] as Dictionary<
                        any,
                        any
                    >;

                    expect(map.size).toBe(1);

                    let mapKey = keys[key];
                    if (keyTransform) {
                        mapKey = keyTransform(mapKey);
                    }

                    let expectedValue = values[value];
                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                    }

                    const actualValue = map.get(mapKey);

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(compareStructs(actualValue, expectedValue)).toBe(
                            true,
                        );
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );

            // Send the del operation
            const delMessage: DelAllMaps = {
                $$type: "DelAllMaps",
                ...keys,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                delMessage,
            );

            // Retrieve all maps using `allMaps` getter to ensure they are deleted
            const allMapsAfterDel = await contract.getAllMaps();

            // Iterate over mapConfigs and assert maps are empty
            mapConfigs.forEach(({ mapName }) => {
                const map = allMapsAfterDel[mapName] as Dictionary<any, any>;
                expect(map.size).toBe(0);
            });
        }
    });

    it("del: should delete multiple values", async () => {
        // Set multiple values
        for (const { keys, values } of testCases) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Check that all maps are set
        const allMapsBeforeDel = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMapsBeforeDel[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(testCases.length);
        });

        // Delete them
        for (const { keys } of testCases) {
            const delMessage: DelAllMaps = { $$type: "DelAllMaps", ...keys };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                delMessage,
            );
        }

        // Ensure maps are empty
        const allMapsAfterDel = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMapsAfterDel[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(0);
        });
    });

    it("del: should not affect other keys when deleting", async () => {
        // Set multiple values
        for (const { keys, values } of testCases) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Delete only the first test case's keys
        const keysToDelete = testCases[0]!.keys;
        const delMessage: DelAllMaps = {
            $$type: "DelAllMaps",
            ...keysToDelete,
        };
        await contract.send(
            treasury.getSender(),
            { value: toNano("1") },
            delMessage,
        );

        // Check that only the deleted keys are removed
        const allMapsAfterDel = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMapsAfterDel[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(testCases.length - 1);
        });

        // Verify other keys are unaffected
        for (const { keys, values } of testCases.slice(1)) {
            const getResponse = await contract.getAllMaps();

            mapConfigs.forEach(
                ({ mapName, key, value, keyTransform, valueTransform }) => {
                    const map = getResponse[mapName] as Dictionary<any, any>;

                    let mapKey = keys[key];
                    if (keyTransform) {
                        mapKey = keyTransform(mapKey);
                    }

                    let expectedValue = values[value];
                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                    }

                    const actualValue = map.get(mapKey);

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(compareStructs(actualValue, expectedValue)).toBe(
                            true,
                        );
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );
        }
    });

    it("del: should do nothing when deleting non-existent keys", async () => {
        // Set values except for the last test case
        for (const { keys, values } of testCases.slice(0, -1)) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Ensure existing data is unaffected
        const allMapsBeforeDel = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMapsBeforeDel[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(testCases.length - 1);
        });

        // Attempt to delete non-existent keys
        const nonExistentKeys = testCases[testCases.length - 1]!.keys;
        const delMessage: DelAllMaps = {
            $$type: "DelAllMaps",
            ...nonExistentKeys,
        };
        await contract.send(
            treasury.getSender(),
            { value: toNano("1") },
            delMessage,
        );

        // Ensure existing data is unaffected
        const allMapsAfterDel = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMapsAfterDel[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(testCases.length - 1);
        });

        // Verify that the existing values are still there
        for (const { keys, values } of testCases.slice(0, -1)) {
            const allMaps = await contract.getAllMaps();

            mapConfigs.forEach(
                ({ mapName, key, value, keyTransform, valueTransform }) => {
                    const map = allMaps[mapName] as Dictionary<any, any>;

                    let mapKey = keys[key];
                    if (keyTransform) {
                        mapKey = keyTransform(mapKey);
                    }

                    let expectedValue = values[value];
                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                    }

                    const actualValue = map.get(mapKey);

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(compareStructs(actualValue, expectedValue)).toBe(
                            true,
                        );
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }
                },
            );
        }
    });

    it("del: should handle delete after overwriting", async () => {
        for (const { keys } of testCases) {
            for (const { values } of testCases) {
                // Set values
                const setMessage: SetAllMaps = {
                    $$type: "SetAllMaps",
                    ...keys,
                    ...values,
                };
                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    setMessage,
                );

                // Delete values
                const delMessage: DelAllMaps = {
                    $$type: "DelAllMaps",
                    ...keys,
                };
                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    delMessage,
                );

                // Ensure maps are empty
                const allMapsAfterDel = await contract.getAllMaps();
                mapConfigs.forEach(({ mapName }) => {
                    const map = allMapsAfterDel[mapName] as Dictionary<
                        any,
                        any
                    >;
                    expect(map.size).toBe(0);
                });
            }
        }
    });

    it("exists: should return 'true' for existing keys and 'false' for non-existent keys", async () => {
        // Set values for all test cases
        for (const { keys, values } of testCases.slice(0, -1)) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        // Check that all keys exist
        for (const { keys } of testCases.slice(0, -1)) {
            const existsResponse = await contract.getExistsAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
            );

            Object.values(existsResponse).forEach((exists) => {
                if (typeof exists === "boolean") {
                    expect(exists).toBe(true);
                }
            });
        }

        // Check that non-existent keys do not exist
        const nonExistentKeys = testCases[testCases.length - 1]!.keys;
        const nonExistentResponse = await contract.getExistsAllMaps(
            nonExistentKeys.keyInt,
            nonExistentKeys.keyInt8,
            nonExistentKeys.keyInt42,
            nonExistentKeys.keyInt256,
            nonExistentKeys.keyUint8,
            nonExistentKeys.keyUint42,
            nonExistentKeys.keyUint256,
            nonExistentKeys.keyAddress,
        );

        Object.values(nonExistentResponse).forEach((exists) => {
            if (typeof exists === "boolean") {
                expect(exists).toBe(false);
            }
        });
    });

    it("exists: should still return 'true' after overwriting", async () => {
        for (const { keys } of testCases) {
            for (const { values } of testCases) {
                // Send the set operation
                const setMessage: SetAllMaps = {
                    $$type: "SetAllMaps",
                    ...keys,
                    ...values,
                };

                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    setMessage,
                );

                // Call the .exists operation on all maps
                const existsResponse = await contract.getExistsAllMaps(
                    keys.keyInt,
                    keys.keyInt8,
                    keys.keyInt42,
                    keys.keyInt256,
                    keys.keyUint8,
                    keys.keyUint42,
                    keys.keyUint256,
                    keys.keyAddress,
                );

                Object.values(existsResponse).forEach((exists) => {
                    if (typeof exists === "boolean") {
                        expect(exists).toBe(true);
                    }
                });
            }
        }
    });

    it("exists: should return 'false' for all keys after clearing all maps", async () => {
        for (const { keys, values } of testCases) {
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );
        }

        for (const { keys } of testCases) {
            const clearMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                valueVarint16: null,
                valueVarint32: null,
                valueVaruint16: null,
                valueVaruint32: null,
                valueBool: null,
                valueCell: null,
                valueAddress: null,
                valueStruct: null,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                clearMessage,
            );
        }

        for (const { keys } of testCases) {
            const existsResponse = await contract.getExistsAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
            );

            Object.values(existsResponse).forEach((exists) => {
                if (typeof exists === "boolean") {
                    expect(exists).toBe(false);
                }
            });
        }
    });

    it("isEmpty: should return 'true' for empty maps and 'false' for non-empty maps", async () => {
        for (const { keys, values } of testCases) {
            // Check that all maps are empty initially
            const initialIsEmptyResponse = await contract.getIsEmptyAllMaps();
            Object.values(initialIsEmptyResponse).forEach((isEmpty) => {
                if (typeof isEmpty === "boolean") {
                    expect(isEmpty).toBe(true);
                }
            });

            // Set values for the current test case
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Check that all maps are non-empty
            const nonEmptyIsEmptyResponse = await contract.getIsEmptyAllMaps();
            Object.values(nonEmptyIsEmptyResponse).forEach((isEmpty) => {
                if (typeof isEmpty === "boolean") {
                    expect(isEmpty).toBe(false);
                }
            });

            // Clear all maps
            for (const { keys } of testCases) {
                const clearMessage: SetAllMaps = {
                    $$type: "SetAllMaps",
                    ...keys,
                    valueVarint16: null,
                    valueVarint32: null,
                    valueVaruint16: null,
                    valueVaruint32: null,
                    valueBool: null,
                    valueCell: null,
                    valueAddress: null,
                    valueStruct: null,
                };
                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    clearMessage,
                );
            }

            // Check that all maps are empty again
            const emptyIsEmptyResponse = await contract.getIsEmptyAllMaps();
            Object.values(emptyIsEmptyResponse).forEach((isEmpty) => {
                if (typeof isEmpty === "boolean") {
                    expect(isEmpty).toBe(true);
                }
            });
        }
    });

    it("asCell: should correctly serialize and deserialize maps", async () => {
        for (const { keys, values } of testCases) {
            // Set values for the current test case
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };
            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Serialize all maps to a Cell
            const cellResponse = await contract.getAsCellAllMaps();

            // Retrieve all maps using `allMaps` getter
            const allMaps = await contract.getAllMaps();

            // Iterate over mapConfigs and perform assertions
            mapConfigs.forEach(
                ({ mapName, key, value, keyTransform, valueTransform }) => {
                    const map = allMaps[mapName] as Dictionary<any, any>;

                    expect(map.size).toBe(1);

                    let mapKey = keys[key];
                    if (keyTransform) {
                        mapKey = keyTransform(mapKey);
                    }

                    let expectedValue = values[value];
                    if (valueTransform) {
                        expectedValue = valueTransform(expectedValue);
                    }

                    const actualValue = map.get(mapKey);

                    if (expectedValue instanceof Cell) {
                        expect(actualValue).toEqualCell(expectedValue);
                    } else if (expectedValue instanceof Address) {
                        expect(actualValue).toEqualAddress(expectedValue);
                    } else if (isSomeStruct(expectedValue)) {
                        expect(compareStructs(actualValue, expectedValue)).toBe(
                            true,
                        );
                    } else {
                        expect(actualValue).toEqual(expectedValue);
                    }

                    // Serialize the map from allMaps to a Cell to compare with the response
                    const serializedMap = beginCell()
                        .storeDictDirect(map)
                        .endCell();

                    expect(cellResponse[mapName]).toEqualCell(serializedMap);
                },
            );

            // Clear all maps
            for (const { keys } of testCases) {
                const clearMessage: SetAllMaps = {
                    $$type: "SetAllMaps",
                    ...keys,
                    valueVarint16: null,
                    valueVarint32: null,
                    valueVaruint16: null,
                    valueVaruint32: null,
                    valueBool: null,
                    valueCell: null,
                    valueAddress: null,
                    valueStruct: null,
                };
                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    clearMessage,
                );
            }

            // Confirm that empty maps serialize to null and not empty Cells
            const allMapsAsCell = await contract.getAsCellAllMaps();
            mapConfigs.forEach(({ mapName }) => {
                const map = allMapsAsCell[mapName] as Cell | null;
                expect(map).toBe(null);
            });
        }
    });

    it("replace: should replace values and clear them", async () => {
        for (const { keys } of testCases) {
            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...testCases[0]!.values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            for (const { values } of testCases) {
                // Send the replace operation
                const replaceMessage: ReplaceAllMaps = {
                    $$type: "ReplaceAllMaps",
                    ...keys,
                    ...values,
                };

                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    replaceMessage,
                );

                // Retrieve all maps using `allMaps` getter
                const allMaps = await contract.getAllMaps();

                // Iterate over mapConfigs and perform assertions
                mapConfigs.forEach(
                    ({ mapName, key, value, keyTransform, valueTransform }) => {
                        const map = allMaps[mapName] as Dictionary<any, any>;

                        expect(map.size).toBe(1);

                        let mapKey = keys[key];
                        if (keyTransform) {
                            mapKey = keyTransform(mapKey);
                        }

                        let expectedValue = values[value];
                        if (valueTransform) {
                            expectedValue = valueTransform(expectedValue);
                        }

                        const actualValue = map.get(mapKey);

                        if (expectedValue instanceof Cell) {
                            expect(actualValue).toEqualCell(expectedValue);
                        } else if (expectedValue instanceof Address) {
                            expect(actualValue).toEqualAddress(expectedValue);
                        } else if (isSomeStruct(expectedValue)) {
                            expect(
                                compareStructs(actualValue, expectedValue),
                            ).toBe(true);
                        } else {
                            expect(actualValue).toEqual(expectedValue);
                        }
                    },
                );
            }

            // Clear all maps
            for (const { keys } of testCases) {
                const clearMessage: ReplaceAllMaps = {
                    $$type: "ReplaceAllMaps",
                    ...keys,
                    valueVarint16: null,
                    valueVarint32: null,
                    valueVaruint16: null,
                    valueVaruint32: null,
                    valueBool: null,
                    valueCell: null,
                    valueAddress: null,
                    valueStruct: null,
                };
                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    clearMessage,
                );
            }
        }

        // Check that all maps are empty again
        const allMaps = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMaps[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(0);
        });
    });

    it("replace: should not replace values when keys do not exist", async () => {
        for (const { keys, values } of testCases) {
            // Send the replace operation
            const replaceMessage: ReplaceAllMaps = {
                $$type: "ReplaceAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                replaceMessage,
            );

            // Retrieve all maps using `allMaps` getter
            const allMaps = await contract.getAllMaps();

            // Check that all maps are still empty
            mapConfigs.forEach(({ mapName }) => {
                const map = allMaps[mapName] as Dictionary<any, any>;
                expect(map.size).toBe(0);
            });
        }
    });

    it("replace: should return 'true' when replacing values and 'false' when keys do not exist", async () => {
        for (const { keys, values } of testCases) {
            // Call the .replace operation on all maps
            const replaceResult = await contract.getReplaceAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
                values.valueVarint16,
                values.valueVarint32,
                values.valueVaruint16,
                values.valueVaruint32,
                values.valueBool,
                values.valueCell,
                values.valueAddress,
                values.valueStruct,
            );

            // Check that all return values are 'false'
            Object.values(replaceResult).forEach((result) => {
                if (typeof result === "boolean") {
                    expect(result).toBe(false);
                }
            });

            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Call the .replace operation on all maps
            const replaceResultAfterSet = await contract.getReplaceAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
                values.valueVarint16,
                values.valueVarint32,
                values.valueVaruint16,
                values.valueVaruint32,
                values.valueBool,
                values.valueCell,
                values.valueAddress,
                values.valueStruct,
            );

            // Check that all return values are 'true'
            Object.values(replaceResultAfterSet).forEach((result) => {
                if (typeof result === "boolean") {
                    expect(result).toBe(true);
                }
            });
        }
    });

    it("replaceGet: should replace values and clear them", async () => {
        for (const { keys } of testCases) {
            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...testCases[0]!.values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            for (const { values } of testCases) {
                // Send the replace operation
                const replaceGetMessage: ReplaceGetAllMaps = {
                    $$type: "ReplaceGetAllMaps",
                    ...keys,
                    ...values,
                };

                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    replaceGetMessage,
                );

                // Retrieve all maps using `allMaps` getter
                const allMaps = await contract.getAllMaps();

                // Iterate over mapConfigs and perform assertions
                mapConfigs.forEach(
                    ({ mapName, key, value, keyTransform, valueTransform }) => {
                        const map = allMaps[mapName] as Dictionary<any, any>;

                        expect(map.size).toBe(1);

                        let mapKey = keys[key];
                        if (keyTransform) {
                            mapKey = keyTransform(mapKey);
                        }

                        let expectedValue = values[value];
                        if (valueTransform) {
                            expectedValue = valueTransform(expectedValue);
                        }

                        const actualValue = map.get(mapKey);

                        if (expectedValue instanceof Cell) {
                            expect(actualValue).toEqualCell(expectedValue);
                        } else if (expectedValue instanceof Address) {
                            expect(actualValue).toEqualAddress(expectedValue);
                        } else if (isSomeStruct(expectedValue)) {
                            expect(
                                compareStructs(actualValue, expectedValue),
                            ).toBe(true);
                        } else {
                            expect(actualValue).toEqual(expectedValue);
                        }
                    },
                );
            }

            // Clear all maps
            for (const { keys } of testCases) {
                const clearMessage: ReplaceGetAllMaps = {
                    $$type: "ReplaceGetAllMaps",
                    ...keys,
                    valueVarint16: null,
                    valueVarint32: null,
                    valueVaruint16: null,
                    valueVaruint32: null,
                    valueBool: null,
                    valueCell: null,
                    valueAddress: null,
                    valueStruct: null,
                };
                await contract.send(
                    treasury.getSender(),
                    { value: toNano("1") },
                    clearMessage,
                );
            }
        }

        // Check that all maps are empty again
        const allMaps = await contract.getAllMaps();
        mapConfigs.forEach(({ mapName }) => {
            const map = allMaps[mapName] as Dictionary<any, any>;
            expect(map.size).toBe(0);
        });
    });

    it("replaceGet: should not replace values when keys do not exist", async () => {
        for (const { keys, values } of testCases) {
            // Send the replace operation
            const replaceGetMessage: ReplaceGetAllMaps = {
                $$type: "ReplaceGetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                replaceGetMessage,
            );

            // Retrieve all maps using `allMaps` getter
            const allMaps = await contract.getAllMaps();

            // Check that all maps are still empty
            mapConfigs.forEach(({ mapName }) => {
                const map = allMaps[mapName] as Dictionary<any, any>;
                expect(map.size).toBe(0);
            });
        }
    });

    it("replaceGet: should return old values when replaced and null when keys do not exist", async () => {
        for (const { keys, values } of testCases) {
            // Call the .replace operation on all maps
            const replaceGetResult = await contract.getReplaceGetAllMaps(
                keys.keyInt,
                keys.keyInt8,
                keys.keyInt42,
                keys.keyInt256,
                keys.keyUint8,
                keys.keyUint42,
                keys.keyUint256,
                keys.keyAddress,
                values.valueVarint16,
                values.valueVarint32,
                values.valueVaruint16,
                values.valueVaruint32,
                values.valueBool,
                values.valueCell,
                values.valueAddress,
                values.valueStruct,
            );

            // Check that all return values are 'null'
            Object.values(replaceGetResult).forEach((result) => {
                if (result !== "ReplaceGetAllMapsResult") {
                    expect(result).toBeNull();
                }
            });

            // Send the set operation
            const setMessage: SetAllMaps = {
                $$type: "SetAllMaps",
                ...keys,
                ...values,
            };

            await contract.send(
                treasury.getSender(),
                { value: toNano("1") },
                setMessage,
            );

            // Call the .replace operation on all maps
            const replaceGetResultAfterSet =
                await contract.getReplaceGetAllMaps(
                    keys.keyInt,
                    keys.keyInt8,
                    keys.keyInt42,
                    keys.keyInt256,
                    keys.keyUint8,
                    keys.keyUint42,
                    keys.keyUint256,
                    keys.keyAddress,
                    values.valueVarint16,
                    values.valueVarint32,
                    values.valueVaruint16,
                    values.valueVaruint32,
                    values.valueBool,
                    values.valueCell,
                    values.valueAddress,
                    values.valueStruct,
                );

            // Check that all return values are equal to the old values
            mapConfigs.forEach(({ mapName, value, valueTransform }) => {
                let expectedValue = values[value];
                let actualValue = replaceGetResultAfterSet[mapName];
                if (valueTransform) {
                    expectedValue = valueTransform(expectedValue);
                    actualValue = valueTransform(actualValue);
                }

                if (expectedValue instanceof Cell) {
                    expect(actualValue).toEqualCell(expectedValue);
                } else if (expectedValue instanceof Address) {
                    expect(actualValue).toEqualAddress(expectedValue);
                } else if (isSomeStruct(expectedValue)) {
                    expect(
                        compareStructs(
                            actualValue as SomeStruct,
                            expectedValue,
                        ),
                    ).toBe(true);
                } else {
                    expect(actualValue).toEqual(expectedValue);
                }
            });
        }
    });

    it("checkNullReference: should throw an error in getter when accessing a null reference", async () => {
        await expect(contract.getCheckNullReference()).rejects.toThrow();
    });

    it("checkNullReference: should throw an error in receiver when accessing a null reference", async () => {
        const result = await contract.send(
            treasury.getSender(),
            { value: toNano("1") },
            {
                $$type: "CheckNullReference",
            },
        );

        expect(result.transactions).toHaveLength(3);
        expect(result.transactions).toHaveTransaction({
            on: contract.address,
            success: false,
            exitCode: 128,
        });
    });
});
