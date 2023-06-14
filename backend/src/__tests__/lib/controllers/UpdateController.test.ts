import { UpdateChecker } from "../../../controllers/UpdateController";


describe("UpdateController tests", () => {
    test("name without tag is the same", () => {
        expect(UpdateChecker.stripImageTagFromName('nginx')).toEqual('nginx');
    });
    test("simple name with tag", () => {
        expect(UpdateChecker.stripImageTagFromName('nginx:latest')).toEqual('nginx');
    });
    test("name in group with tag", () => {
        expect(UpdateChecker.stripImageTagFromName('homeassistant/home-assistant:2023.6.1')).toEqual('homeassistant/home-assistant');
    });
});
