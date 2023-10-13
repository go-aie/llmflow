
let workflowName = ''
let workflowSchema = '{}'
let workflowResult = undefined

import { JSONEditor } from './svelte-jsoneditor/vanilla.js'

const configuration = {
	toolbox: {
		isCollapsed: true,
		groups: [
			{
				name: 'Operators',
				steps: [
					{
						componentType: 'switch',
						type: 'decision',
						name: 'Switch',
						properties: {
							expression: ''
						},
						branches: {
							'default': []
						}
					},
					{
						componentType: 'task',
						type: 'terminate',
						name: 'Return',
						properties: {
							output: ''
						}
					},
					{
						componentType: 'container',
						type: 'loop',
						name: 'Loop',
						properties: {
						},
						sequence: []
					},
					{
						componentType: 'task',
						type: 'iterate',
						name: 'Iterate',
						properties: {
							type: 'list',
							value: ''
						}
					}
				]
			},
			{
				name: 'Embeddings',
				steps: [
					{
						componentType: 'task',
						type: 'embedding',
						name: 'Embedding',
						properties: {
							model: "",
							uri: "",
							api_key: "",
							texts: ""
						}
					}
				]
			},
			{
				name: 'Vector Stores',
				steps: [
					{
						componentType: 'task',
						type: 'vectorstore_upsert',
						name: 'VectorStore_Upsert',
						properties: {
							vendor: "",
							uri: "",
							api_key: "",
							vectors: [],
							documents: []
						}
					},
					{
						componentType: 'task',
						type: 'vectorstore_query',
						name: 'VectorStore_Query',
						properties: {
							vendor: "",
							uri: "",
							api_key: "",
							vector: [],
							top_k: 0,
							min_score: 0
						}
					},
					{
						componentType: 'task',
						type: 'vectorstore_delete',
						name: 'VectorStore_Delete',
						properties: {
							vendor: "",
							uri: "",
							api_key: ""
						}
					},
				]
			},
			{
				name: 'Prompts',
				steps: [
					{
						componentType: 'task',
						type: 'template',
						name: 'Prompt',
						properties: {
							template: "",
							args: ""
						}
					}
				]
			},
			{
				name: 'LLMs',
				steps: [
					{
						componentType: 'task',
						type: 'llm',
						name: 'LLM',
						properties: {
							model: "",
							uri: "",
							api_key: "",
							prompt: "",
							temperature: 0,
						}
					}
				]
			},
			{
				name: 'Tools',
				steps: [
					{
						componentType: 'task',
						type: 'http',
						name: 'HTTP',
						properties: {
							method: '',
							uri: '',
							header: '',
							body: ''
						}
					},
					{
						componentType: 'task',
						type: 'code',
						name: 'Code',
						properties: {
							code: "",
							ctx: ""
						}
					}
				]
			}
		]
	},

	steps: {
		iconUrlProvider: componentType => {
			const icons = {
				switch: './assets/icon-if.svg',
				container: './assets/icon-loop.svg',
				task: './assets/icon-task.svg'
			}
			return componentType in icons ? icons[componentType] : './assets/icon-task.svg';
		}
	},

	editors: {
		globalEditorProvider: () => {
			const editor = document.createElement('div')
			appendTitle(editor, 'Workflow')

			const we = document.createElement('div')  // Workflow Editor
			const ui = document.createElement('div')  // User Interface
			editor.appendChild(we)
			editor.appendChild(ui)

			var inputForm

			// Build Workflow Editor
			const labelName = document.createElement('h3')
			labelName.innerText = 'Name'
			we.appendChild(labelName)

			const input = createInputElement('text', workflowName, value => {
				workflowName = value
			})
			we.appendChild(input)

			const labelSchema = document.createElement('h3')
			labelSchema.innerText = 'Schema'
			we.appendChild(labelSchema)

			const schemaEditor = createJSONEditor(workflowSchema, (update) => {
				workflowSchema = update.text
				console.log('workflowSchema', update)
				// Re-render the inputForm.
				renderForm(inputForm, JSON.parse(workflowSchema).input)
			})
			we.appendChild(schemaEditor)

			// Build User Interface
			const labelInput = document.createElement('h3')
			labelInput.innerText = 'Input'
			ui.appendChild(labelInput)

			inputForm = document.createElement('div')
			ui.appendChild(inputForm)
			renderForm(inputForm, JSON.parse(workflowSchema).input)

			const labelOutput = document.createElement('h3')
			labelOutput.innerText = 'Output'
			ui.appendChild(labelOutput)

			workflowResult = createJSONEditor('', (update) => {}, true)
			ui.appendChild(workflowResult)

			return editor
		},

		stepEditorProvider: (step, editorContext) => {
			switch (step.componentType) {
				case 'switch':
					return switchStepEditorProvider(step, editorContext);
				default:
					let {editor, _} = otherStepEditorProvider(step, editorContext);
					return editor;
			}
		}
	},

	controlBar: true,
};

const schema = {
	"decision": {
		input: {
			type: 'object',
			properties: {
				expression: {
					"type": "string"
				}
			},
			required: [
				'expression'
			]
		}
	},
	"terminate": {
		input: {
			type: 'object',
			properties: {
				output: {}
			},
			required: [
				'output'
			]
		}
	},
	"loop": {},
	"iterate": {
		input: {
			type: 'object',
			properties: {
				type: {
					"type": "string",
					"enum": ["list", "map", "range"]
				},
				value: {}
			},
			required: [
				'type',
				'value'
			]
		}
	},
	"embedding": {
		input: {
			type: 'object',
			properties: {
				model: {
					"type": "string"
				},
				uri: {
					"type": "string"
				},
				api_key: {
					"type": "string"
				},
				texts: {
					"type": "array",
					"items": {
						"type": "string",
						"description": "The text to embed"
					}
				}
			},
			required: [
				'model',
				'uri',
				'api_key',
				'texts'
			]
		}
	},
    "vectorstore_upsert": {
		input: {
		  "type": "object",
		  "properties": {
			"vendor": {
			  "type": "string",
			},
			"uri": {
			  "type": "string",
			},
			"api_key": {
			  "type": "string",
			},
			"vectors": {
			  "type": "array",
			  "items": {
				"type": "array",
				"items": {
				  "type": "number",
				}
			  }
			},
			"documents": {
			  "type": "array",
			  "items": {
				"type": "object",
				"properties": {
				  "id": {
					"type": "string"
				  },
				  "text": {
					"type": "string"
				  },
				  "vector": {
					"type": "array",
					"items": {
					  "type": "number",
					}
				  },
				  "metadata": {
					"type": "object",
					"properties": {
					  "source_id": {
						"type": "string"
					  }
					}
				  },
				  "extra": {
					"type": "string"
				  }
				}
			  }
			}
		  },
		  "required": [
			"vendor",
			"uri",
			"api_key",
			"vectors",
			"documents"
		  ]
      }
    },
	"vectorstore_query": {
		input: {
			type: 'object',
			properties: {
				vendor: {
					"type": "string"
				},
				uri: {
					"type": "string"
				},
				api_key: {
					"type": "string"
				},
				vector: {
				  "type": "array",
				  "items": {
					"type": "number",
				  }
				},
				top_k: {
				  "type": "integer",
				},
				min_score: {
				  "type": "number",
				}
			},
			required: [
				'vendor',
				'uri',
				'api_key',
				'vector',
				'top_k',
				'min_score'
			]
		}
	},
	"vectorstore_delete": {
		"input": {
		  "type": "object",
		  "properties": {
			"vendor": {
			  "type": "string",
			  "description": "The vendor name"
			},
			"uri": {
			  "type": "string",
			  "description": "The endpoint of the vector store"
			},
			"api_key": {
			  "type": "string",
			  "description": "The API key"
			}
		  },
		  "required": [
			"vendor",
			"uri",
			"api_key"
		  ]
		}
	},
	"template": {
		input: {
			type: 'object',
			properties: {
				template: {
					"type": "string"
				},
				args: {
					"type": "object",
					"description": "The argument values",
					"patternProperties": {
						"^.*$": {}
					}
				}
			},
			required: [
				'template',
				'args'
			]
		}
	},
	"llm": {
		input: {
			type: 'object',
			properties: {
				model: {
					"type": "string"
				},
				uri: {
					"type": "string"
				},
				api_key: {
					"type": "string"
				},
				prompt: {
					"type": "string"
				},
				temperature: {
					"type": "number"
				}
			},
			required: [
				'model',
				'uri',
				'api_key',
				'prompt',
				'temperature'
			]
		}
	},
	"http": {
		"input": {
		"type": "object",
		"properties": {
			"method": {
				"type": "string",
				"enum": ["POST", "GET", "PUT", "PATCH", "DELETE"]
			},
			"uri": {
				"type": "string",
			},
			"header": {
				"type": "object",
				"patternProperties": {
					"^.*$": {
						"type": "array",
						"items": {
							"type": "string"
						}
					}
				}
			},
			"body": {
				"type": "object",
				"patternProperties": {
					"^.*$": {}
				}
			}
		},
		"required": [
			"method",
			"uri",
		]
		},
		"output": {
			"type": "object",
			"properties": {
				"status": {
					"type": "integer",
				},
				"header": {
					"type": "object",
					"patternProperties": {
						"^.*$": {
							"type": "array",
							"items": {
								"type": "string"
							}
						}
					}
				},
				"body": {
					"type": "object",
					"patternProperties": {
						"^.*$": {}
					}
				}
			}
		}
	},
	"code": {
		"input": {
		"type": "object",
		"properties": {
			"code": {
				"type": "string",
			},
			"ctx": {
				"type": "object",
				"patternProperties": {
					"^.*$": {}
				}
			}
		},
		"required": [
			"code",
			"ctx"
		]
		},
		"output": {
			"type": "object",
			"properties": {
				"result": {},
				"error": {
					"type": "string",
				}
			}
		}
	}
}

const customTasks = [
	"code",
	"llm",
	"embedding",
	"vectorstore_upsert",
	"vectorstore_query",
	"vectorstore_delete"
]

function renderForm(ui, schema) {
	const Form = JSONSchemaForm.default;
	const log = (type) => console.log.bind(console, type);
	const element = React.createElement(
	Form,
	{
		schema: schema,
		uiSchema: {
			"ui:submitButtonOptions": {
				norender: false,
				submitText: "Run"
			}
		},
		onChange: log("changed"),
		onSubmit: runWorkflow,
		onError: log("errors")
	  }
	)
	ReactDOM.render(element, ui)
}

function switchStepEditorProvider(step, editorContext) {
	let {editor, lastElem} = otherStepEditorProvider(step, editorContext);

	function createCase(lastElem, step, value) {
		const input = createInputElement('text', value, (value) => {
			console.log('change case input from', input.oldvalue, 'to', value);

			let steps = step.branches[input.oldvalue];
			if (steps === undefined) {
				steps = [];
			}
			delete step.branches[input.oldvalue];

			step.branches[value] = steps;
			editorContext.notifyChildrenChanged();
		}, 'blur', '85%');
		const add = document.createElement('button');
		add.innerText = '+';
		const del = document.createElement('button');
		del.innerText = '-';
		lastElem.insertAdjacentElement('afterend', input);
		input.insertAdjacentElement('afterend', add);
		add.insertAdjacentElement('afterend', del);

		add.addEventListener('click', () => {
			createCase(del, step, '');
		});
		del.addEventListener('click', () => {
			let parent = input.parentNode;

			// Remove input element;
			parent.removeChild(input);
			// Remove add element;
			parent.removeChild(add);
			// Remove del element;
			parent.removeChild(del);

			delete step.branches[input.value];
			editorContext.notifyChildrenChanged();
		});
	}

	const label = document.createElement('label');
	label.innerText = 'cases';
	label.className = 'required';
	lastElem.insertAdjacentElement('afterend', label);

	// Add cases
	for (const [name, _] of Object.entries(step.branches)) {
		console.log('branch name', name);
		createCase(label, step, name);
	}

	return editor
}

function getStepLabel(type) {
	switch (type) {
		case 'decision':
			return 'Switch'
		case 'terminate':
			return 'Return'
		case 'template':
			return 'Prompt'
		case 'llm':
			return 'LLM'
		case 'http':
			return 'HTTP'
		default:
			return titleCase(type)
	}
}

function otherStepEditorProvider(step, editorContext) {
	const editor = document.createElement('div');
	appendTitle(editor, getStepLabel(step.type));

	appendTextField(editor, 'Name', step.name,
		v => {
			step.name = v;
			editorContext.notifyNameChanged();
		});

	const input = document.createElement('h3');
	input.innerText = 'Input';
	editor.appendChild(input);

	const container = document.createElement('div');
	container.className = 'container';
	editor.appendChild(container)

	let lastElem = null;

	const stepSchema = schema[step.type]
	const required = stepSchema.input.required

	for (const [stepName, stepValue] of Object.entries(step.properties)) {
		const label = document.createElement('label');
		label.innerText = stepName;
		if (required instanceof Array && required.includes(stepName)) {
			label.className = 'required';
		}
		container.appendChild(label);

		const inputType = getInputType(stepSchema, stepName)
		console.log('stepName', stepName, 'inputType', inputType)

		if (inputType === 'option') {
			const select = document.createElement('select');
			select.addEventListener('change', () => {
				step.properties[stepName] = select.value;
			});

			const enumOptions = stepSchema.input.properties[stepName].enum
			for (let opt of enumOptions) {
				const option = document.createElement('option');
				option.value = opt;
				option.text = opt;
				select.appendChild(option);
			}

			// Set value after all options have been attached.
			select.value = stepValue
			container.appendChild(select)
			lastElem = select
		} else if (inputType === 'textarea') {
			const textarea = document.createElement('textarea')
			textarea.style.width = '98%'
			textarea.value = stepValue
			textarea.rows = 5
			textarea.addEventListener('input', () => {
				step.properties[stepName] = textarea.value
			})
			container.appendChild(textarea)

			lastElem = textarea
		} else if (inputType === 'json') {
			const jsonEditor = createJSONEditor(stepValue, (update) => {
				step.properties[stepName] = update.text
			})
			container.appendChild(jsonEditor);

			lastElem = jsonEditor;
		} else {
			const input = createInputElement(inputType, stepValue, (value) => {
				step.properties[stepName] = value;
				console.log('new properties', step.properties)
			})
			container.appendChild(input)

			lastElem = input
		}
	}

	return {editor, lastElem};
}

function getInputType(schema, name) {
	if (schema.input.properties[name] === undefined) {
		return ''
	}

	const schemaType = schema.input.properties[name].type
	const enumOptions = schema.input.properties[name].enum
	console.log('schemaType...', schemaType)

	let inputType = '';
	switch (schemaType) {
		case 'string':
			inputType = 'text'
			if (name === 'api_key') {
				inputType = 'password'
			}
			if (['template', 'code'].includes(name)) {
				inputType = 'textarea'
			}
			if (enumOptions instanceof Array) {
				inputType = 'option'
			}
			break;
		case 'integer':
		case 'number':
			inputType = schemaType
			break;
		default:
			// undefined, array, object
			inputType = 'json'
	}
	return inputType
}

function createJSONEditor(initialValue, onChange, readOnly=false) {
	const div = document.createElement('div');
	const jsonEditor = new JSONEditor({
		target: div,
		props: {
			content: {
				text: initialValue
			},
			mode: "text",
			mainMenuBar: false,
			onChange: onChange,
			readOnly: readOnly
		}
	})
	div.editor = jsonEditor
	return div
}

function createInputElement(type, value, onChange, eventType='input', width='98%') {
	const input = document.createElement('input')
	if (type === 'boolean') {
		input.setAttribute('type', 'checkbox')
		input.style.width = width
		input.checked = value
		input.addEventListener('click', () => {
			onChange(input.checked)
		});
	} else {
		input.setAttribute('type', type)
		input.style.width = width
		input.value = value
		input.oldvalue = value
		input.addEventListener(eventType, () => {
			onChange(input.value)
			input.oldvalue = input.value
		})
	}
	return input
}

const startDefinition = {
	properties: {},
	sequence: []
};

const placeholder = document.getElementById('designer');
//var designer = sequentialWorkflowDesigner.Designer.create(placeholder, startDefinition, configuration);
var designer;

function appendTitle(parent, text) {
	const title = document.createElement('h2');
	title.innerText = text;
	parent.appendChild(title);
}

function appendTextField(parent, label, startValue, set) {
	const field = document.createElement('h3');
	parent.appendChild(field);
	field.innerHTML = `<label></label> <input type="text">`;
	field.querySelector('label').innerText = label;
	const input = field.querySelector('input');
	input.style.width = '98%'
	input.value = startValue
	field.addEventListener('input', () => set(input.value));
}

function loadTaskFromStep(step) {
	step = unWrapCallTask(step)

	let s = {
		id: sequentialWorkflowDesigner.Uid.next(),
		type: step.type,
		name: step.name,
		componentType: 'task',
		properties: {...step.input},
		schema: schema[step.type]
	}

	switch (step.type) {
		case 'decision':
			s.properties = {expression: step.input.expression}
			s.componentType = 'switch'
			s.branches = {}

			for (const [cond, caseTask] of Object.entries(step.input.cases)) {
				let steps = [];
				if (caseTask.type === 'serial') {
					for (let task of caseTask.input.tasks) {
						steps.push(loadTaskFromStep(task));
					}
				} else {
					steps.push(loadTaskFromStep(caseTask));
				}
				s.branches[cond] = steps;
			}

			if (step.input.default) {
				let steps = [];
				if (step.input.default.type === 'serial') {
					for (let task of step.input.default.input.tasks) {
						steps.push(loadTaskFromStep(task));
					}
				} else {
					steps.push(loadTaskFromStep(step.input.default));
				}
				s.branches['default'] = steps;
			}
			console.log('loadTaskFromStep', step.type, s)

			break

		case 'loop':
			s.componentType = 'container'
			s.properties = {}
			s.sequence = []

			if (step.input.iterator) {
				let t = loadTaskFromStep(step.input.iterator);
				s.sequence.push(t);
			}

			if (step.input.body) {
				for (let task of step.input.body.input.tasks) {
					s.sequence.push(loadTaskFromStep(task));
				}
			}

			break
	}

	for (const [name, value] of Object.entries(s.properties)) {
		if (getInputType(s.schema, name) === 'json') {
			// JSON object => JSON string
			s.properties[name] = JSON.stringify(value, null, 2);
		}
	}

	return s
}

async function loadWorkflow() {
	console.log("loading...")
	const [handle] = await window.showOpenFilePicker();
	this.handle = handle;
	this.file = await handle.getFile();

	let workflow = JSON.parse(await this.file.text())
	workflowName = workflow.name
	workflowSchema = JSON.stringify(workflow.input.schema, null, 2)

	let defs = []
	for (let step of workflow.input.tasks) {
		defs.push(loadTaskFromStep(step));
	}

	const definition = {
		sequence: defs,
		properties: {}
	};

	designer = sequentialWorkflowDesigner.Designer.create(placeholder, definition, configuration);

	document.getElementById('save').disabled = false;
	//document.getElementById('run').disabled = false;
}

async function saveWorkflow() {
	const data = getDefinitions()

	const bytes = JSON.stringify(data, null, 2);
	let blob = new Blob([bytes], {type: "application/json"});

	const writable = await document.getElementById('load').handle.createWritable();
	await writable.write(blob);
	await writable.close();
}

function titleCase(str) {
  return str.split('_').map(function(word) {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join('_');
}

function getDefFromStep(step) {
	let def = {
		type: step.type,
		name: step.name,
		input: {...step.properties}
	}

	switch (step.type) {
		case 'decision':
			def.input = {
				expression: step.properties.expression,
				cases: {},
				default: {},
			}

			for (const [cond, steps] of Object.entries(step.branches)) {
				let tasks = [];
				for (let s of steps) {
					tasks.push(getDefFromStep(s));
				}

				if (cond === 'default') {
					if (tasks.length === 1) {
						def.input.default = tasks[0]
					} else {
						def.input.default = {
							type: 'serial',
							name: 'switch',
							input: {
								tasks: tasks,
							}
						}
					}
				} else {
					if (tasks.length === 1) {
						def.input.cases[cond] = tasks[0]
					} else {
						def.input.cases[cond] = {
							type: 'serial',
							name: 'switch',
							input: {
								tasks: tasks,
							}
						}
					}
				}
			}

			break

		case 'loop':
			def.input = {
				iterator: {},
				body: {
					type: 'serial',
					name: 'loop',
					input: {
						tasks: []
					}
				}
			}

			if (step.sequence.length > 0) {
				def.input.iterator = getDefFromStep(step.sequence[0]);

				for (let s of step.sequence.slice(1)) {
					def.input.body.input.tasks.push(getDefFromStep(s));
				}
			}

			break
	}


	for (const [name, value] of Object.entries(def.input)) {
		if (getInputType(schema[def.type], name) === 'json' && def.input[name] !== '') {
			// JSON string => JSON object
			console.log('name', name, 'value', value)
			def.input[name] = JSON.parse(value);
		}
	}

	def = wrapCallTask(def)

	return def;
}

function wrapCallTask(t) {
	if (!(customTasks.includes(t.type))) {
		return t
	}

	return {
		type: 'call',
		name: t.name,
		input: {
			loader: 'system',
			task: t.type,
			input: t.input
		}
	}
}

function unWrapCallTask(t) {
	if (t.type !== 'call') {
		return t
	}

	return {
		name: t.name,
		type: t.input.task,
		input: t.input.input
	}
}

function getDefinitions() {
	const definition = designer.getDefinition();

	var defs = [];
	for (let step of definition.sequence) {
		defs.push(getDefFromStep(step))
	}

	return {
		type: 'serial',
		name: workflowName,
		input: {
			schema: JSON.parse(workflowSchema),
			tasks: defs
		}
	}
}

async function runWorkflow(form) {
	const task = getDefinitions();
	console.log('task', JSON.stringify(task));

	// Upsert task.
	await fetch('/api/tasks/' + workflowName, {
		method: 'PUT',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({definition: task})
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			console.log(JSON.stringify(response.json()));
		});

	// Execute task.
	await fetch('/api', {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: workflowName,
			input: form.formData,
		})
	})
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const result = await response.json();
			console.log(JSON.stringify(result));

			//alert(JSON.stringify(result))
			workflowResult.editor.set({
				text: JSON.stringify(result, null, 2)
			})
		});
}

async function runWorkflowInChatBot() {
	const query = document.getElementById('input-field').value;
	addMessage('user-message', query);

	const data = getDefinitions();
	console.log('data', JSON.stringify(data));

	// Upsert task.
	await fetch('/api/tasks/test', {
		method: 'PUT',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({definition: data})
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			console.log(JSON.stringify(response.json()));
		});

	// Execute task.
	await fetch('/api', {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: 'test',
			input: {
				query: query
			}
		})
	})
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const result = await response.json();
			console.log(JSON.stringify(result));

			addMessage('chatbot', result['message']);
		});
}

function addMessage(msgType, msgContent) {
	var message = document.createElement("div");
	message.className = 'chatbot-message ' + msgType;

	let content = document.createElement('p');
	content.className = 'chatbot-text';
	content.innerText = msgContent;
	message.appendChild(content);

	let parent = document.getElementById('conversation');
	parent.appendChild(message);
}

document.getElementById('load').addEventListener('click', loadWorkflow);
document.getElementById('save').addEventListener('click', saveWorkflow);
document.getElementById('submit-button').addEventListener('click', runWorkflowInChatBot);
