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
		Constructor: func(def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			vs := &VectorStoreDelete{def: def}
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

type VectorStoreDelete struct {
	def *orchestrator.TaskDefinition

	Input struct {
		Vendor string  `json:"vendor"`
		Config *Config `json:"config"`
	}

	store VectorStore
}

func NewVectorStoreDelete(name string) *VectorStoreDelete {
	return &VectorStoreDelete{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeVectorStoreDelete,
		},
	}
}

func (vs *VectorStoreDelete) Name() string { return vs.def.Name }

func (vs *VectorStoreDelete) String() string {
	return fmt.Sprintf("%s(name:%s)", vs.def.Type, vs.def.Name)
}

func (vs *VectorStoreDelete) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	if err := vs.store.Delete(ctx); err != nil {
		return nil, err
	}
	return orchestrator.Output{}, nil
}
