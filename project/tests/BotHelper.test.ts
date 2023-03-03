import "reflect-metadata";

import { beforeEach, describe, expect, it } from "@jest/globals";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { TestHelper } from "./common/TestHelper";

const testHelper = new TestHelper();

const logger = testHelper.getTestLogger();

const jsonUtil = testHelper.getTestJsonUtil();
const randomUtil = testHelper.getTestRandomUtil();
const configServer = testHelper.getTestConfigServer();

const localisationService = testHelper.getTestLocalisationService();

const databaseServer = testHelper.getTestDatabaseServer();

describe("BotHelper", () =>
{
    let helper: BotHelper;
    beforeEach(() =>
    {
        helper = new BotHelper(logger, jsonUtil, databaseServer, randomUtil, localisationService, configServer);
    });

    it("BotHelper type check", () =>
    {
        expect(helper).toBeInstanceOf(BotHelper);
    });

    it("isBotPmc()", () =>
    {
        expect(helper.isBotPmc("usec")).toBe(true);
        expect(helper.isBotPmc("bear")).toBe(true);
        expect(helper.isBotPmc("faketype")).toBe(false);
    });

    it("isBotFollower()", () =>
    {
        expect(helper.isBotFollower("followerBully")).toBe(true);
        expect(helper.isBotFollower("FoLlOwErBULlY")).toBe(true);
        expect(helper.isBotFollower("followerSanitar")).toBe(true);
        expect(helper.isBotFollower("botFollower")).toBe(false);
    });

    it("getBotTemplate()", () =>
    {
        expect(helper.getBotTemplate("assault")).not.toBeFalsy();
        expect(helper.getBotTemplate("fakebottype")).toBeFalsy();
        expect(helper.getBotTemplate("")).toBeFalsy();
    });
});