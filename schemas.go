package llmflow

import (
	"embed"

	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/orchestrator/builtin"
)

// Schemas for tasks defined in llmflow.
var TaskSchemas map[string]map[string]any

// Schemas for flows defined in llmflow.
var FlowSchemas map[string]map[string]any

//go:embed *.json vectorstore/*.json
var allFS embed.FS

func init() {
	TaskSchemas = builtin.MustCollectFiles(allFS, ".schema.json", nil)
	FlowSchemas = builtin.MustCollectFiles(allFS, ".flow.json", MustExtractFlowSchema)

	// Register flows into the "llmflow" namespace. Now these flows can be used by a `Call` task.
	m := builtin.MustCollectFiles(allFS, ".flow.json", nil)
	builtin.LoaderRegistry.MustRegister("llmflow", builtin.MapLoader(m))
}

// MustExtractFlowSchema extracts the schema from a flow definition.
func MustExtractFlowSchema(def map[string]any) map[string]any {
	// Currently, a flow is always defined as a Serial task, whose input contains the schema.
	var serial struct {
		Input struct {
			Schema map[string]any `json:"schema"`
		} `json:"input"`
	}
	if err := orchestrator.DefaultCodec.Decode(def, &serial); err != nil {
		panic(err)
	}
	return serial.Input.Schema
}
