# Perplexity

This example is a simple clone of [Perplexity AI][1].


## Quick Start

Start [Ollama][2]:

```bash
ollama serve
```

Run this flow using LLMFlow:

```bash
BING_SEARCH_V7_SUBSCRIPTION_KEY=<YOUR_KEY> llmflow run perlexity.flow.yaml
>>> Is GPT-3.5 free to use?
Greetings! I'm here to help you with your question. To answer your query, GPT-3.5 is a language model that is available in both free and paid versions. The free version of ChatGPT, which GPT-3.5 is a part of, is accessible to everyone without any cost. However, if you want to use the advanced features of GPT-3.5, you will need to subscribe to the paid Turbo API.

It's important to note that while the free version of ChatGPT offers access to GPT-3.5, it may not provide the same level of accuracy and functionality as the paid version. As mentioned in [[citation:2]], the paid Turbo API offers more advanced features and improved performance compared to the free version.

In summary, GPT-3.5 is free to use in its basic form through the free web app version of ChatGPT. However, if you want to unlock its full potential, you may need to subscribe to the paid Turbo API.

>>> 
```

Or run the online version of this flow:

```bash
BING_SEARCH_V7_SUBSCRIPTION_KEY=<YOUR_KEY> llmflow run https://raw.githubusercontent.com/go-aie/llmflow/main/examples/perplexity/perplexity.flow.yaml
```


[1]: https://www.perplexity.ai/
[2]: https://github.com/ollama/ollama
