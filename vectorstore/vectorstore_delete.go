package vectorstore

import (
	"context"
	"fmt"

	"github.com/RussellLuo/orchestrator"
)

const TypeVectorStoreDelete = "vectorstore_delete"

func init() {
	MustRegisterVectorStoreDelete(orchestrator.GlobalRegistry)
}

func MustRegisterVectorStoreDelete(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeVectorStoreDelete,
		New:  func() orchestrator.Task { return new(VectorStoreDelete) },
	})
}

type VectorStoreDelete struct {
	orchestrator.TaskHeader

	Input struct {
		Vendor string  `json:"vendor"`
		Config *Config `json:"config"`
	} `json:"input"`

	store VectorStore
}

func (vs *VectorStoreDelete) Init(r *orchestrator.Registry) error {
	store, err := New(vs.Input.Vendor, vs.Input.Config)
	if err != nil {
		return err
	}
	vs.store = store
	return nil
}

func (vs *VectorStoreDelete) String() string {
	return fmt.Sprintf("%s(name:%s)", vs.Type, vs.Name)
}

func (vs *VectorStoreDelete) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	if err := vs.store.Delete(ctx); err != nil {
		return nil, err
	}
	return orchestrator.Output{}, nil
}

type VectorStoreDeleteBuilder struct {
	task *VectorStoreDelete
}

func NewVectorStoreDelete(name string) *VectorStoreDeleteBuilder {
	task := &VectorStoreDelete{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeVectorStoreDelete,
		},
	}
	return &VectorStoreDeleteBuilder{task: task}
}

func (b *VectorStoreDeleteBuilder) Build() orchestrator.Task { return b.task }
