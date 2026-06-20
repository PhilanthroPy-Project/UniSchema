import { z } from 'zod'

/** Admin-mappable ConstituentEvent fields (mirrors frontend MAPPABLE_TARGET_FIELDS). */
export const MAPPABLE_CONSTITUENT_EVENT_FIELDS = [
  'constituentEmail',
  'firstName',
  'lastName',
  'eventType',
  'amount',
  'currency',
] as const

export const MappableTargetFieldSchema = z.enum(MAPPABLE_CONSTITUENT_EVENT_FIELDS)

export type MappableTargetField = z.infer<typeof MappableTargetFieldSchema>

export const MappingConnectionSchema = z.object({
  source: z.string().trim().min(1, 'Source field path is required'),
  target: MappableTargetFieldSchema,
})

export type MappingConnection = z.infer<typeof MappingConnectionSchema>

export const MetadataMappingSchema = z.object({
  source: z.string().trim().min(1, 'Source field path is required'),
  key: z.string().trim().min(1, 'Metadata key is required'),
})

export type MetadataMapping = z.infer<typeof MetadataMappingSchema>

export const MappingArtifactSchema = z
  .object({
    vendor: z.string().trim().min(1, 'Vendor is required'),
    exportedAt: z.string().datetime({ message: 'exportedAt must be an ISO-8601 datetime' }),
    mappings: z.array(MappingConnectionSchema),
    metadataMappings: z.array(MetadataMappingSchema).default([]),
  })
  .superRefine((artifact, ctx) => {
    const seenTargets = new Set<string>()

    for (const [index, mapping] of artifact.mappings.entries()) {
      if (seenTargets.has(mapping.target)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate target field "${mapping.target}" — each ConstituentEvent field may only be mapped once`,
          path: ['mappings', index, 'target'],
        })
      } else {
        seenTargets.add(mapping.target)
      }
    }

    const seenMetadataKeys = new Set<string>()

    for (const [index, metadataMapping] of artifact.metadataMappings.entries()) {
      if (seenMetadataKeys.has(metadataMapping.key)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate metadata key "${metadataMapping.key}" — each metadata key may only be mapped once`,
          path: ['metadataMappings', index, 'key'],
        })
      } else {
        seenMetadataKeys.add(metadataMapping.key)
      }
    }
  })

export type MappingArtifact = z.infer<typeof MappingArtifactSchema>

export const MappingSyncResponseSchema = z.object({
  success: z.literal(true),
  vendor: z.string(),
  mappingCount: z.number().int().nonnegative(),
  syncedAt: z.string().datetime(),
})

export type MappingSyncResponse = z.infer<typeof MappingSyncResponseSchema>
