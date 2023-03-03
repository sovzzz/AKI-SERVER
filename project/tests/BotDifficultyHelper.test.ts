import "reflect-metadata";

import { beforeEach, describe, expect, it } from "@jest/globals";
import { BotDifficultyHelper } from "@spt-aki/helpers/BotDifficultyHelper";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { MockHelper } from "./common/MockHelper";
import { TestHelper } from "./common/TestHelper";

const testHelper = new TestHelper();
const mockHelper = new MockHelper();

const logger = testHelper.getTestLogger();

const jsonUtil = testHelper.getTestJsonUtil();
const randomUtil = testHelper.getTestRandomUtil();
const configServer = testHelper.getTestConfigServer();
const botHelper = testHelper.getTestBotHelper();

const localisationService = testHelper.getTestLocalisationService();

const databaseServer = testHelper.getTestDatabaseServer();

describe("BotHelper", () =>
{
    let botDifficultyHelper: BotDifficultyHelper;
    beforeEach(() =>
    {
        botDifficultyHelper = new BotDifficultyHelper(logger, jsonUtil, databaseServer, randomUtil, localisationService, botHelper, configServer);
    });

    it("BotDifficultyHelper type check", () =>
    {
        expect(botDifficultyHelper).toBeInstanceOf(BotDifficultyHelper);
    });

    it("chooseRandomDifficulty()", () =>
    {
        expect(["easy", "normal", "hard", "impossible"]).toContain(botDifficultyHelper.chooseRandomDifficulty());
    });

    it("getPmcDifficultySettings() easy", () =>
    {
        expect(botDifficultyHelper.getPmcDifficultySettings("bear", "easy", "sptUsec", "sptBear")).not.toBeFalsy();
    });

    it("getPmcDifficultySettings() random", () =>
    {
        expect(botDifficultyHelper.getPmcDifficultySettings("usec", "random", "sptUsec", "sptBear")).not.toBeFalsy();
    });

    it("getPmcDifficultySettings() difficulty set to 'medium' in config", () =>
    {

        const configServerMock = mockHelper.getMockConfigServer();
        const mockBotConfig = {
            kind: "aki-bot",
            pmc: {
                difficulty: "medium",
                enemyTypes: ["assault"]
            }
        };
        configServerMock.setup(x => x.getConfig(ConfigTypes.BOT)).returns(() => mockBotConfig);

        const testOnlyHelper = new BotDifficultyHelper(logger, jsonUtil, databaseServer, randomUtil, localisationService, botHelper, configServerMock.object);

        expect(testOnlyHelper.getPmcDifficultySettings("usec", "medium", "sptUsec", "sptBear")).not.toBeFalsy();
    });

});