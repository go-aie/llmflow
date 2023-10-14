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

//go:embed *.json
var allFS embed.FS

func init() {
	TaskSchemas = builtin.MustCollectFiles(allFS, ".schema.json", nil)

	// Extract schemas from flow definitions.
	FlowSchemas = builtin.MustCollectFiles(allFS, ".flow.json", func(m map[string]any) map[string]any {
		// Currently, a flow is always defined as a Serial task, whose input contains the schema.
		var serial struct {
			Input struct {
				Schema map[string]any `json:"schema"`
			} `json:"input"`
		}
		if err := orchestrator.DefaultCodec.Decode(m, &serial); err != nil {
			panic(err)
		}
		return serial.Input.Schema
	})

	// Register flows into the "llmflow" namespace for later use.
	m := builtin.MustCollectFiles(allFS, ".flow.json", nil)
	builtin.LoaderRegistry.MustRegister("llmflow", builtin.MapLoader(m))
}
