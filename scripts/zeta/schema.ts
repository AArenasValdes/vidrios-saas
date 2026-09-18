import { z } from "zod";

import {
  DERIVED_STATUSES,
  GLAZING_TYPES,
  RECIPE_STATUSES,
  TARGET_PURPOSES,
} from "./types.ts";

const positiveNumber = z.number().finite().positive();
const nonNegativeNumber = z.number().finite().nonnegative();
const optionalAngle = z.number().finite().nullable();

export const profileCutSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    position: z.string().min(1).nullable(),
    quantity: positiveNumber,
    lengthMm: positiveNumber,
    cut1Deg: optionalAngle,
    cut2Deg: optionalAngle,
  })
  .strict();

export const glassPieceSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    quantity: positiveNumber,
    widthMm: positiveNumber,
    heightMm: positiveNumber,
  })
  .strict();

export const hardwareItemSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    quantity: nonNegativeNumber,
    unit: z.string().min(1),
  })
  .strict();

export const sourceEvidenceSchema = z
  .object({
    projectId: z.string().min(1).nullable(),
    planId: z.string().min(1).nullable(),
    screenshotPaths: z.array(z.string()),
    rawPath: z.string().min(1).nullable(),
    sourceDocument: z.string().min(1).nullable().optional(),
  })
  .strict();

export const confirmedRecipeSchema = z
  .object({
    id: z.string().min(1),
    manufacturer: z.string().min(1),
    system: z.string().min(1),
    line: z.string().min(1),
    variant: z.string().min(1),
    glazing: z.enum(GLAZING_TYPES),
    leaves: z.number().int().positive(),
    topology: z.string().min(1).nullable(),
    source: z.literal("sistema_zeta"),
    evidenceType: z.literal("plan_de_armado"),
    status: z.literal("confirmed"),
    extractedAt: z.string().min(1).nullable(),
    testDimensions: z
      .object({
        widthMm: positiveNumber,
        heightMm: positiveNumber,
      })
      .strict(),
    profiles: z.array(profileCutSchema).min(1),
    glass: z.array(glassPieceSchema).min(1),
    hardware: z.array(hardwareItemSchema).min(1),
    sourceEvidence: sourceEvidenceSchema,
  })
  .strict();

export const extractTargetSchema = z
  .object({
    id: z.string().min(1),
    manufacturer: z.string().min(1),
    system: z.string().min(1),
    line: z.string().min(1),
    variant: z.string().min(1),
    glazing: z.enum(GLAZING_TYPES),
    glassCode: z.string().min(1),
    leaves: z.number().int().positive(),
    widthMm: positiveNumber,
    heightMm: positiveNumber,
    status: z.enum(RECIPE_STATUSES),
    purpose: z.enum(TARGET_PURPOSES),
    reason: z.string().optional(),
    colorHint: z.string().optional(),
    topologyHint: z.string().optional(),
    confirmedRecipeId: z.string().optional(),
  })
  .strict();

export const derivedFormulaSchema = z
  .object({
    id: z.string().min(1),
    manufacturer: z.string().min(1),
    system: z.string().min(1),
    line: z.string().min(1),
    variant: z.string().min(1),
    profileCode: z.string().min(1),
    profileName: z.string().min(1),
    formula: z.string().min(1),
    inputs: z.array(z.string().min(1)).min(1),
    evidenceIds: z.array(z.string().min(1)).min(1),
    observations: z
      .array(
        z
          .object({
            recipeId: z.string().min(1),
            leaves: z.number().int().positive(),
            widthMm: positiveNumber,
            heightMm: positiveNumber,
            lengthMm: positiveNumber,
            quantity: positiveNumber,
          })
          .strict(),
      )
      .min(1),
    confidence: z.enum(["low", "medium", "high"]),
    status: z.enum(DERIVED_STATUSES),
    notes: z.array(z.string()),
  })
  .strict();
