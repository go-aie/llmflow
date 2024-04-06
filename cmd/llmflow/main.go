package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/orchestrator/builtin"
	"github.com/alecthomas/kong"
	"github.com/chzyer/readline"
	"sigs.k8s.io/yaml"
)

type ServeCmd struct {
	Addr string `help:"The TCP network address to listen on." default:":8888"`
}

func (cmd *ServeCmd) Run() error {
	return startServer(cmd.Addr, false, make(chan int))
}

type RunCmd struct {
	Filename string `help:"Filename or URL to a file that represents a flow." arg:""`
}

func (cmd *RunCmd) Run() error {
	stopC := make(chan int)
	go func() {
		_ = startServer(":8888", true, stopC)
	}()

	var f flow
	switch ext := filepath.Ext(cmd.Filename); ext {
	case ".yaml":
		if err := cmd.readFlow("application/yaml", cmd.Filename, &f); err != nil {
			return err
		}

	case ".json":
		if err := cmd.readFlow("application/json", cmd.Filename, &f); err != nil {
			return err
		}

	default:
		return fmt.Errorf("unsupported format: %q", ext)
	}

	if err := cmd.addFlow(f); err != nil {
		return err
	}

	rl, err := readline.NewEx(&readline.Config{
		Prompt:          ">>> ",
		InterruptPrompt: "^C",
		EOFPrompt:       "exit",
	})
	if err != nil {
		return err
	}
	defer rl.Close()
	//rl.CaptureExitSignal()

Next:
	for {
		var query string
		query, err = rl.Readline()
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}

		// TODO: Support messages.
		data := map[string]string{"query": query}
		body, err := json.Marshal(data)
		if err != nil {
			return err
		}

		url := fmt.Sprintf("http://localhost:8888/api/flows/%s:run", f.Name)
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		reader := builtin.NewEventStreamReader(resp.Body, 1<<16)
		for {
			event, err := reader.ReadEvent()
			if err != nil {
				if err == io.EOF {
					// Reach the end of the response payload.
					continue Next
				}
				return err
			}
			// Show the event data.
			if len(event.Data) > 0 {
				// TODO: Support other output format?
				var eventData struct {
					Content string `json:"content"`
				}
				if err := json.Unmarshal(event.Data, &eventData); err != nil {
					return err
				}
				fmt.Printf(eventData.Content)
			}
		}
	}

	return nil
}

func (cmd *RunCmd) readFlow(mimetype string, filename string, f *flow) error {
	var data []byte
	if strings.HasPrefix(filename, "http://") || strings.HasPrefix(filename, "https://") {
		resp, err := http.Get(filename)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		content, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		data = content
	} else {
		content, err := os.ReadFile(filename)
		if err != nil {
			return err
		}
		data = content
	}

	switch mimetype {
	case "application/yaml":
		return yaml.Unmarshal(data, f)
	case "application/json":
		return json.Unmarshal(data, f)
	}
	return nil
}

func (cmd *RunCmd) addFlow(f flow) error {
	data, err := json.Marshal(f)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("PUT", "http://localhost:8888/api/flows/"+f.Name, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

type flow struct {
	orchestrator.TaskHeader
	Input map[string]any `json:"input"`
}

var cli struct {
	Serve ServeCmd `cmd:"" help:"Start LLMFlow."`
	Run   RunCmd   `cmd:"" help:"Run a flow."`
}

func main() {
	ctx := kong.Parse(&cli)
	err := ctx.Run()
	ctx.FatalIfErrorf(err)
}
