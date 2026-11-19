CREATE TABLE ontology_states (
 id TEXT PRIMARY KEY NOT NULL CHECK(id='development'),
 revision INTEGER NOT NULL CHECK(revision>=0),
 data TEXT NOT NULL CHECK(json_valid(data) AND coalesce(json_extract(data,'$.version')=1 AND json_type(data,'$.entities')='array' AND json_type(data,'$.relationships')='array' AND json_array_length(data,'$.entities')<=512 AND json_array_length(data,'$.relationships')<=2048 AND length(CAST(data AS BLOB))<=262144,0)),
 nonce TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE ontology_audit (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 operation_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('decision','replay_conflict')),
 principal TEXT NOT NULL,
 request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 action TEXT NOT NULL,
 context TEXT NOT NULL CHECK(json_valid(context)),
 before_revision INTEGER NOT NULL CHECK(before_revision>=0),
 after_revision INTEGER NOT NULL CHECK(after_revision>=before_revision),
 result TEXT NOT NULL CHECK(json_valid(result)),
 created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_ontology_operation ON ontology_audit(operation_id) WHERE kind='decision';
--> statement-breakpoint
CREATE TABLE ontology_credentials (
 id TEXT PRIMARY KEY NOT NULL,
 agent_id TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash)=64),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL CHECK(expires_at>created_at),
 revoked_at INTEGER
);
--> statement-breakpoint
CREATE TRIGGER ontology_audit_no_update BEFORE UPDATE ON ontology_audit BEGIN SELECT RAISE(ABORT,'ontology audit is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ontology_audit_no_delete BEFORE DELETE ON ontology_audit BEGIN SELECT RAISE(ABORT,'ontology audit is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ontology_state_revision BEFORE UPDATE ON ontology_states WHEN NEW.revision<>OLD.revision+1 OR NEW.nonce=OLD.nonce BEGIN SELECT RAISE(ABORT,'ontology revision/nonce required'); END;
--> statement-breakpoint
CREATE TRIGGER ontology_state_no_delete BEFORE DELETE ON ontology_states BEGIN SELECT RAISE(ABORT,'ontology state cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER ontology_credential_agent BEFORE INSERT ON ontology_credentials WHEN NOT EXISTS(SELECT 1 FROM ontology_states s,json_each(s.data,'$.entities') a WHERE s.id='development' AND json_extract(a.value,'$.kind')='agent' AND json_extract(a.value,'$.id')=NEW.agent_id AND json_extract(a.value,'$.active')=1) BEGIN SELECT RAISE(ABORT,'active ontology agent required'); END;
