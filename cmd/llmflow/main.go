package main

import (
	"github.com/alecthomas/kong"
)

type ServeCmd struct {
	Addr string `help:"The TCP network address to listen on." default:":8888"`
}

func (cmd *ServeCmd) Run() error {
	return startServer(cmd.Addr)
}

type RunCmd struct{
	Filename string `help:"Filename or URL to a file that represents a flow." arg:""`
}

func (cmd *RunCmd) Run() error {
	return nil
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
