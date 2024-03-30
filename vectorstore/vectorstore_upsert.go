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
		New:  func() orchestrator.Task { return new(VectorStoreUpsert) },
	})
}

type VectorStoreUpsert struct {
	orchestrator.TaskHeader

	Input struct {
		Vendor string  `json:"vendor"`
		Config *Config `json:"config"`

		Vectors   orchestrator.Expr[[]llmflow.Vector]    `json:"vectors"`
		Documents orchestrator.Expr[[]*llmflow.Document] `json:"documents"`
	} `json:"input"`

	store VectorStore
}

func (vs *VectorStoreUpsert) Init(r *orchestrator.Registry) error {
	store, err := New(vs.Input.Vendor, vs.Input.Config)
	if err != nil {
		return err
	}
	vs.store = store
	return nil
}

func (vs *VectorStoreUpsert) String() string {
	return fmt.Sprintf("%s(name:%s)", vs.Type, vs.Name)
}

func (vs *VectorStoreUpsert) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	vectors, err := vs.Input.Vectors.EvaluateX(input)
	if err != nil {
		return nil, err
	}

	documents, err := vs.Input.Documents.EvaluateX(input)
	if err != nil {
		return nil, err
	}

	if len(vectors) != len(documents) {
		return nil, fmt.Errorf("len(vectors) does not equal len(documents)")
	}

	// Attach vectors to documents.
	for i, vector := range vectors {
		documents[i].Vector = vector
	}

	if err := vs.store.Upsert(ctx, documents); err != nil {
		return nil, err
	}

	return orchestrator.Output{}, nil
}

type VectorStoreUpsertBuilder struct {
	task *VectorStoreUpsert
}

func NewVectorStoreUpsert(name string) *VectorStoreUpsertBuilder {
	task := &VectorStoreUpsert{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeVectorStoreUpsert,
		},
	}
	return &VectorStoreUpsertBuilder{task: task}
}

func (b *VectorStoreUpsertBuilder) Build() orchestrator.Task { return b.task }
