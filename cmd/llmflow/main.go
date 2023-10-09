package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"
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
	"sigs.k8s.io/yaml"
)

//go:embed ui
var staticFiles embed.FS

type LLMFlow struct {
	definitions map[string]map[string]any
	mu          sync.RWMutex
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
			"loader": "user",
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
	var path string
	flag.StringVar(&path, "flow", "./flow.yaml", "path to the YAML config")
	flag.Parse()

	//os.Setenv("CODE_API_ENDPOINT", "http://127.0.0.1:5005/exec")
	//os.Setenv("CODE_API_KEY", "")

	yamlContent, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("failed to read file: %s\n", path)
	}

	jsonContent, err := yaml.YAMLToJSON(yamlContent)
	if err != nil {
		log.Fatalf("failed to convert YAML to JSON: %s\n", path)
	}

	var m map[string]map[string]any
	if err := json.Unmarshal(jsonContent, &m); err != nil {
		log.Fatalf("failed to unmarshal flow definitions to map: %v\n", err)
	}

	definitions := make(map[string]map[string]any)
	for name, flowDef := range m {
		var def *orchestrator.TaskDefinition
		if err := orchestrator.DefaultCodec.Decode(flowDef, &def); err != nil {
			log.Fatalf("failed to unmarshal flow definitions to task definitions: %v\n", err)
		}
		definitions[name] = flowDef
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"OPTIONS", "PUT", "POST", "DELETE"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	llmflow := &LLMFlow{
		definitions: definitions,
	}
	httpapp.MountRouter(r, "/api", api.NewHTTPRouter(llmflow, httpcodec.NewDefaultCodecs(nil)))

	// Register user-defined tasks.
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
