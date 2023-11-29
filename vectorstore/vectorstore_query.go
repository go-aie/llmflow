package vectorstore

import (
	"context"
	"fmt"

	"github.com/RussellLuo/orchestrator"
	"github.com/go-aie/llmflow"
)

const TypeVectorStoreQuery = "vectorstore_query"

func init() {
	MustRegisterVectorStoreQuery(orchestrator.GlobalRegistry)
}

func MustRegisterVectorStoreQuery(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeVectorStoreQuery,
		Constructor: func(def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			vs := &VectorStoreQuery{def: def}
			if err := r.Decode(def.InputTemplate, &vs.Input); err != nil {
				return nil, err
			}

			store, err := New(vs.Input.Vendor, vs.Input.Config)
			if err != nil {
				return nil, err
			}
			vs.store = store
			return vs, nil
		},
	})
}

type VectorStoreQuery struct {
	def *orchestrator.TaskDefinition

	Input struct {
		Vendor string  `json:"vendor"`
		Config *Config `json:"config"`

		Vector   orchestrator.Expr[llmflow.Vector] `json:"vector"`
		TopK     int                               `json:"top_k"`
		MinScore float64                           `json:"min_score"`
	}

	store VectorStore
}

func NewVectorStoreQuery(name string) *VectorStoreQuery {
	return &VectorStoreQuery{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeVectorStoreQuery,
		},
	}
}

func (vs *VectorStoreQuery) Name() string { return vs.def.Name }

func (vs *VectorStoreQuery) String() string {
	return fmt.Sprintf("%s(name:%s)", vs.def.Type, vs.def.Name)
}

func (vs *VectorStoreQuery) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	if err := vs.Input.Vector.Evaluate(input); err != nil {
		return nil, err
	}

	similarities, err := vs.store.Query(ctx, vs.Input.Vector.Value, vs.Input.TopK, vs.Input.MinScore)
	if err != nil {
		return nil, err
	}

	sims, err := orchestrator.DefaultCodec.Encode(similarities)
	if err != nil {
		return nil, err
	}

	return orchestrator.Output{"similarities": sims}, nil
}