package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/RussellLuo/kun/pkg/appx/httpapp"
	"github.com/RussellLuo/kun/pkg/httpcodec"
	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/orchestrator/builtin"
	"github.com/go-aie/llmflow"
	_ "github.com/go-aie/llmflow/vectorstore"
	"github.com/go-aie/llmflow/cmd/llmflow/api"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"

	"golang.org/x/exp/slices"
)

//go:embed ui
var staticFiles embed.FS

type LLMFlow struct {
	groups []string
	tools  map[string][]api.Tool

	definitions map[string]map[string]any
	mu          sync.RWMutex
}

func NewLLMFlow() *LLMFlow {
	return &LLMFlow{
		groups: []string{"Operators", "Embeddings", "Vector Stores", "Documents", "Prompts", "LLMs", "Tools"},
		tools: map[string][]api.Tool{
			"Operators": {
				{
					Type: "decision",
					Name: "Switch",
				},
				{
					Type: "terminate",
					Name: "Return",
				},
				{
					Type: "loop",
					Name: "Loop",
				},
				{
					Type: "iterate",
					Name: "Iterate",
				},
			},
			"Embeddings": {
				{
					Type: "embedding",
					Name: "Embedding",
				},
			},
			"Vector Stores": {
				{
					Type: "vectorstore_upsert",
					Name: "VectorStore_Upsert",
				},
				{
					Type: "vectorstore_query",
					Name: "VectorStore_Query",
				},
				{
					Type: "vectorstore_delete",
					Name: "VectorStore_Delete",
				},
			},
			"Documents": {
				{
					Type: "text_loader",
					Name: "TextLoader",
				},
				{
					Type: "jsonlines_loader",
					Name: "JSONLinesLoader",
				},
				{
					Type: "splitter",
					Name: "Splitter",
				},
			},
			"Prompts": {
				{
					Type: "template",
					Name: "Prompt",
				},
			},
			"LLMs": {
				{
					Type: "llm",
					Name: "LLM",
				},
			},
			"Tools": {
				{
					Type: "http",
					Name: "HTTP",
				},
				{
					Type: "xhttp",
					Name: "xHTTP",
				},
				{
					Type: "code",
					Name: "Code",
				},
			},
		},
		definitions: make(map[string]map[string]any),
	}
}

func (lf *LLMFlow) GetTools(ctx context.Context) (groups []string, tools map[string][]api.Tool, err error) {
	lf.mu.RLock()
	defer lf.mu.RUnlock()
	return lf.groups, lf.tools, nil
}

func (lf *LLMFlow) UpsertTool(ctx context.Context, group, typ string, tool api.Tool) (err error) {
	lf.mu.Lock()
	defer lf.mu.Unlock()

	lf.tools[group] = append(lf.tools[group], tool)
	return nil
}

func (lf *LLMFlow) DeleteTool(ctx context.Context, group, typ string) (err error) {
	lf.mu.Lock()
	defer lf.mu.Unlock()

	tools, ok := lf.tools[group]
	if ok {
		for i, t := range tools {
			if t.Type == typ {
				lf.tools[group] = slices.Delete(tools, i, i+1)
				break
			}
		}
	}
	return nil
}

func (lf *LLMFlow) UpsertFlow(ctx context.Context, name string, definition map[string]any) error {
	lf.mu.Lock()
	defer lf.mu.Unlock()

	lf.definitions[name] = definition
	return nil
}

func (lf *LLMFlow) DeleteFlow(ctx context.Context, name string) error {
	lf.mu.Lock()
	defer lf.mu.Unlock()

	delete(lf.definitions, name)
	return nil
}

func (lf *LLMFlow) GetFlow(ctx context.Context, name string) (map[string]any, error) {
	return lf.Load(name)
}

func (lf *LLMFlow) Load(name string) (map[string]any, error) {
	lf.mu.RLock()
	defer lf.mu.RUnlock()

	def, ok := lf.definitions[name]
	if !ok {
		return nil, fmt.Errorf("flow %q not found", name)
	}
	return def, nil
}

func (lf *LLMFlow) GetSchemas(ctx context.Context) (map[string]any, error) {
	userFlowSchemas := make(map[string]map[string]any)
	lf.mu.RLock()
	for name, def := range lf.definitions {
		userFlowSchemas[name] = llmflow.MustExtractFlowSchema(def)
	}
	lf.mu.RUnlock()

	schemas := map[string]any{
		"builtin": map[string]any{
			"task": builtin.TaskSchemas,
		},
		"llmflow": map[string]any{
			"task": llmflow.TaskSchemas,
			"flow": llmflow.FlowSchemas,
		},
		"user": map[string]any{
			"flow": userFlowSchemas,
		},
	}
	return schemas, nil
}

func (lf *LLMFlow) RunFlow(ctx context.Context, name string, input map[string]any) (map[string]any, error) {
	return builtin.CallFlow(ctx, "user", name, input)
}

func (lf *LLMFlow) TestFlow(ctx context.Context, name string, input map[string]any) (orchestrator.Event, error) {
	event, err := builtin.TraceFlow(ctx, "user", name, input)
	if err != nil {
		return orchestrator.Event{}, err
	}

	// Consume the possible iterator and return the complete output.
	iter, ok := orchestrator.Output(event.Output).Iterator()
	if ok {
		output := make(map[string]any)
		var i int
		for result := range iter.Next() {
			if result.Err != nil {
				return orchestrator.Event{}, result.Err
			}
			// Save the output of the iterator for the current iteration.
			output[strconv.Itoa(i)] = map[string]any(result.Output)
			i++
		}
		// Replace the original output with the aggregated iterator output.
		event.Output = output
	}

	return event, nil
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
	httpapp.MountRouter(r, "/api", api.NewHTTPRouter(llmflow, httpcodec.NewDefaultCodecs(nil,
		httpcodec.Op("RunFlow", new(api.EventStream)),
	)))

	// Register user-defined flows into the "user" namespace. Now these flows can be used by a `Call` task.
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
