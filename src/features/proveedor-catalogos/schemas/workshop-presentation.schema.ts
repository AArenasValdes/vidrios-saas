import { z } from "zod";

/** Commercial units persisted by the shared workshop-presentation API. */
export const workshopPurchaseUnitSchema = z.enum(["M", "UN", "KG", "PAR", "TIRA"]);
