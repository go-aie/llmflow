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
		New:  func() orchestrator.Task { return new(VectorStoreQuery) },
	})
}

type VectorStoreQuery struct {
	orchestrator.TaskHeader

	Input struct {
		Vendor string  `json:"vendor"`
		Config *Config `json:"config"`

		Vector   orchestrator.Expr[llmflow.Vector] `json:"vector"`
		TopK     int                               `json:"top_k"`
		MinScore float64                           `json:"min_score"`
	} `json:"input"`

	store VectorStore
}

func (vs *VectorStoreQuery) Init(r *orchestrator.Registry) error {
	if vs.Input.TopK == 0 {
		vs.Input.TopK = 3 // defaults to 3
	}

	store, err := New(vs.Input.Vendor, vs.Input.Config)
	if err != nil {
		return err
	}
	vs.store = store
	return nil
}

func (vs *VectorStoreQuery) String() string {
	return fmt.Sprintf("%s(name:%s)", vs.Type, vs.Name)
}

func (vs *VectorStoreQuery) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	vector, err := vs.Input.Vector.EvaluateX(input)
	if err != nil {
		return nil, err
	}

	similarities, err := vs.store.Query(ctx, vector, vs.Input.TopK, vs.Input.MinScore)
	if err != nil {
		return nil, err
	}

	sims, err := orchestrator.DefaultCodec.Encode(similarities)
	if err != nil {
		return nil, err
	}

	return orchestrator.Output{"similarities": sims}, nil
}

type VectorStoreQueryBuilder struct {
	task *VectorStoreQuery
}

func NewVectorStoreQuery(name string) *VectorStoreQueryBuilder {
	task := &VectorStoreQuery{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeVectorStoreQuery,
		},
	}
	return &VectorStoreQueryBuilder{task: task}
}

func (b *VectorStoreQueryBuilder) Build() orchestrator.Task { return b.task }
