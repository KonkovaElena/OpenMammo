import { z } from "zod";

export const standaloneManifestSchema = z.object({
  product: z.object({
    name: z.literal("mammography-second-opinion"),
    version: z.literal("0.1.0"),
    mode: z.literal("clinician-in-the-loop"),
  }),
  mission: z.string(),
  scope: z.object({
    modality: z.literal("FFDM"),
    examShape: z.literal("bilateral-four-view"),
    standardViews: z.tuple([
      z.literal("L-CC"),
      z.literal("L-MLO"),
      z.literal("R-CC"),
      z.literal("R-MLO"),
    ]),
  }),
  safety: z.object({
    reviewRequired: z.literal(true),
    outputMode: z.literal("draft-only"),
    autonomousDiagnosis: z.literal(false),
  }),
  nonGoals: z.array(z.string()).min(1),
});

export type StandaloneManifest = z.infer<typeof standaloneManifestSchema>;

export const standaloneManifest: StandaloneManifest = standaloneManifestSchema.parse({
  product: {
    name: "mammography-second-opinion",
    version: "0.1.0",
    mode: "clinician-in-the-loop",
  },
  mission:
    "Provide a narrow FFDM mammography second-opinion workflow kernel for clinician-reviewed draft outputs.",
  scope: {
    modality: "FFDM",
    examShape: "bilateral-four-view",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
  },
  safety: {
    reviewRequired: true,
    outputMode: "draft-only",
    autonomousDiagnosis: false,
  },
  nonGoals: [
    "DBT",
    "ultrasound",
    "breast MRI",
    "autonomous diagnosis",
    "PACS replacement",
    "model training platform",
  ],
});