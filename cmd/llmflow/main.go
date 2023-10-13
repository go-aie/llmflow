package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"sync"

	"github.com/RussellLuo/kun/pkg/appx/httpapp"
	"github.com/RussellLuo/kun/pkg/httpcodec"
	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/orchestrator/builtin"
	_ "github.com/go-aie/llmflow"
	"github.com/go-aie/llmflow/cmd/llmflow/api"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
)

//go:embed ui
var staticFiles embed.FS

type LLMFlow struct {
	definitions map[string]map[string]any
	mu          sync.RWMutex
}

func NewLLMFlow() *LLMFlow {
	return &LLMFlow{
		definitions: make(map[string]map[string]any),
	}
}

func (lf *LLMFlow) UpsertTask(ctx context.Context, name string, definition map[string]any) error {
	lf.mu.Lock()
	defer lf.mu.Unlock()

	lf.definitions[name] = definition
	return nil
}

func (lf *LLMFlow) DeleteTask(ctx context.Context, name string) error {
	lf.mu.Lock()
	defer lf.mu.Unlock()

	delete(lf.definitions, name)
	return nil
}

func (lf *LLMFlow) GetTask(ctx context.Context, name string) (map[string]any, error) {
	return lf.Load(name)
}

func (lf *LLMFlow) Load(name string) (map[string]any, error) {
	lf.mu.RLock()
	defer lf.mu.RUnlock()

	return lf.definitions[name], nil
}

func (lf *LLMFlow) Execute(ctx context.Context, name string, input map[string]any) (output map[string]any, err error) {
	def := &orchestrator.TaskDefinition{
		Type: builtin.TypeCall,
		InputTemplate: orchestrator.InputTemplate{
			"loader": "user", // Load tasks from the "user" namespace.
			"task":   name,
			"input":  input,
		},
	}
	call, err := orchestrator.Construct(orchestrator.NewConstructDecoder(orchestrator.GlobalRegistry), def)
	if err != nil {
		log.Fatalf("failed to construct flow[%s]: %v\n", name, err)
	}
	return call.Execute(ctx, orchestrator.NewInput(nil))
}

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"OPTIONS", "PUT", "POST", "DELETE"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	llmflow := NewLLMFlow()
	httpapp.MountRouter(r, "/api", api.NewHTTPRouter(llmflow, httpcodec.NewDefaultCodecs(nil)))

	// Register user-defined tasks into the "user" namespace.
	builtin.LoaderRegistry.MustRegister("user", llmflow)

	// Serve static files
	staticFS, err := fs.Sub(staticFiles, "ui")
	if err != nil {
		log.Fatal(err)
	}

	// Note that the trailing "*" is a must, see https://github.com/go-chi/chi/issues/403.
	r.Handle("/*", http.FileServer(http.FS(staticFS)))

	http.ListenAndServe(":8888", r)
}
