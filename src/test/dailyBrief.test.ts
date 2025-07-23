
import dbService from "../services/jsondb.service"

// only just started to work on this file 

let testDb;

describe("Daily Brief Job Tests", () => {
    beforeAll(() => {
        testDb = dbService.testService();
    })

    afterAll(() => {

    })

    afterEach(() => {
        jest.clearAllMocks();
    })

    describe("Generate Daily Briefing", () => {

    })
})
