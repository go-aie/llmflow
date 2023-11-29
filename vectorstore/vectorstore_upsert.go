package vectorstore

import (
	"context"
	"fmt"

	"github.com/RussellLuo/orchestrator"
	"github.com/go-aie/llmflow"
)

const TypeVectorStoreUpsert = "vectorstore_upsert"

func init() {
	MustRegisterVectorStoreUpsert(orchestrator.GlobalRegistry)
}

func MustRegisterVectorStoreUpsert(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeVectorStoreUpsert,
		Constructor: func(def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			vs := &VectorStoreUpsert{def: def}
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

type VectorStoreUpsert struct {
	def *orchestrator.TaskDefinition

	Input struct {
		Vendor string  `json:"vendor"`
		Config *Config `json:"config"`

		Vectors   orchestrator.Expr[[]llmflow.Vector]    `json:"vectors"`
		Documents orchestrator.Expr[[]*llmflow.Document] `json:"documents"`
	}

	store VectorStore
}

func NewVectorStoreUpsert(name string) *VectorStoreUpsert {
	return &VectorStoreUpsert{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeVectorStoreUpsert,
		},
	}
}

func (vs *VectorStoreUpsert) Name() string { return vs.def.Name }

func (vs *VectorStoreUpsert) String() string {
	return fmt.Sprintf("%s(name:%s)", vs.def.Type, vs.def.Name)
}

func (vs *VectorStoreUpsert) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	if err := vs.Input.Vectors.Evaluate(input); err != nil {
		return nil, err
	}
	if err := vs.Input.Documents.Evaluate(input); err != nil {
		return nil, err
	}

	// Attach vectors to documents.
	documents := vs.Input.Documents.Value
	for i, vector := range vs.Input.Vectors.Value {
		documents[i].Vector = vector
	}

	if err := vs.store.Upsert(ctx, documents); err != nil {
		return nil, err
	}

	return orchestrator.Output{}, nil
}
