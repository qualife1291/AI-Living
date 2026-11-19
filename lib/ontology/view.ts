import {z} from 'zod';
import {entitySchema,relationshipSchema,idSchema,roleSchema} from './schema.ts';
/** Persisted schema stays closed to readonly entities; query schemas cover the
 * actual transport, including permission roles/links derived from server code. */
export const permissionRoleViewSchema=z.object({id:z.string().regex(/^permission_role:/),kind:z.literal('permission_role'),role:roleSchema,capabilities:z.array(z.string()),readOnly:z.literal(true)}).strict();
export const permissionLinkViewSchema=z.object({kind:z.literal('has_permission_role'),from:idSchema,to:z.string().regex(/^permission_role:/),readOnly:z.literal(true)}).strict();
export const queryEntitySchema=z.union([entitySchema,permissionRoleViewSchema]);
export const queryRelationshipSchema=z.union([relationshipSchema,permissionLinkViewSchema]);
