
let workflowName = ''
let workflowSchema = '{}'
let workflowResult = undefined
let workflowAsTool = false

import { JSONEditor } from './svelte-jsoneditor/vanilla.js'

const allSchemas = await loadSchemas()
let allStepLabels = {}

async function loadSchemas() {
	const response = await fetch('/api/schemas', {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
	})
	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`)
	}
	const data = await response.json()
	return data['schemas']
}

async function loadTools() {
	const response = await fetch('/api/tools', {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
	})
	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`)
	}
	const data = await response.json()
	return {
		'groupNames': data['groups'],
		'tools': data['tools']
	}
}

async function loadConfiguration() {
	const {groupNames, tools} = await loadTools()

	let groups = []
	for (const groupName of groupNames) {
		let steps = []
		for (const tool of tools[groupName]) {
			let step = {
				componentType: 'task',
				type: tool.type,
				name: tool.name,
				properties: getEmptyPropertiesByType(tool.type)
			}
			switch (tool.type) {
				case 'decision':
					step.componentType = 'switch'
					step.branches = {
						'default': []
					}
					break
				case 'loop':
					step.componentType = 'container'
					step.sequence = []
					break
			}
			steps.push(step)

			allStepLabels[tool.type] = tool.name

			// Set the tool flag to true if the current flow has been registered as a tool.
			if (step.type === workflowName.toLowerCase()) {
				workflowAsTool = true
			}
		}
		groups.push({
			name: groupName,
			steps: steps,
		})
	}
	console.log(groups)

	return {
		toolbox: {
			isCollapsed: true,
			groups: groups
		},

		steps: {
			iconUrlProvider: componentType => {
				const icons = {
					switch: './assets/icon-if.svg',
					container: './assets/icon-loop.svg',
					task: './assets/icon-task.svg'
				}
				return componentType in icons ? icons[componentType] : './assets/icon-task.svg';
			},
			canInsertStep: (step, targetSequence) => {
				if (step.type === workflowName.toLowerCase()) {
					alert(`Can not insert the custom flow "${workflowName}" into itself!`)
					return false
				}
				return true
			}
		},

		editors: {
			globalEditorProvider: (definition, globalContext) => {
				const editor = document.createElement('div')
				appendTitle(editor, 'Flow')

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

				// Add "set as a tool" flag.
				const asToolValue = createInputElement('boolean', workflowAsTool, value => {
					workflowAsTool = value

					//globalContext.notifyPropertiesChanged()
				}, 'input', '5%')
				we.appendChild(asToolValue)

				const asToolSpan = document.createElement('span')
				asToolSpan.innerText = 'Set as a tool'
				we.appendChild(asToolSpan)

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
	}
}

function getSchemaByType(type) {
	// return schema[type]

	switch (type) {
		case 'decision':
			return {
				"input": {
					"type": "object",
					"required": [
						"expression"
					],
					"properties": {
						"expression": {
							"type": "string"
						}
					}
				},
				"output": {
					"type": "object",
					"patternProperties": {
					  "^.*$": {}
					}
				}
			}
		case 'loop':
			return {
				"input": {},
				"output": {
					"type": "object",
					"patternProperties": {
					  "^.*$": {}
					}
				}
			}
	}

	// Get the schema according to the type.
	//
	// Currently, We assume that `type` is globally unique
	// regardless of the namespace and category.
	for (const [namespace, schemas] of Object.entries(allSchemas)) {
		for (const category of ['task', 'flow']) {
			const subSchemas = schemas[category]
			if (subSchemas !== undefined) {
				const schema = subSchemas[type]
				if (schema !== undefined) {
					return schema
				}
			}
		}
	}
}

function getFlowNamespaceByType(type) {
	for (const [namespace, schemas] of Object.entries(allSchemas)) {
		const flowSchemas = schemas['flow']
		if (flowSchemas !== undefined) {
			const schema = flowSchemas[type]
			if (schema !== undefined) {
				// This is indeed a flow, return the namespace to which it belongs.
				return namespace
			}
		}
	}
	// This is not a flow, return an empty namespace.
	return ''
}

function getEmptyPropertiesByType(type) {
	const schema = getSchemaByType(type)
	if (schema.input.properties == undefined) {
		return {}
	}

	let emptyProperties = {}
	for (const [name, spec] of Object.entries(schema.input.properties)) {
		let emptyValue = null;
		switch (spec.type) {
			case 'string':
				emptyValue = ''
				break
			case 'number':
			case 'integer':
				emptyValue = 0
				break
			case 'boolean':
				emptyValue = false
				break
			default:
				// null/undefined, array, object
				//
				// These complex types are treated as a JSON string.
				emptyValue = ''
				break
		}
		emptyProperties[name] = emptyValue
	}
	return emptyProperties
}

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

function otherStepEditorProvider(step, editorContext) {
	const editor = document.createElement('div');
	appendTitle(editor, allStepLabels[step.type]);

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

	const stepSchema = getSchemaByType(step.type)
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
	if (schema.input.properties === undefined) {
		// No schema found, we assume it's of type string.
		return 'string'
	}
	const inputSchema = schema.input.properties[name]
	if (inputSchema === undefined) {
		// No schema found, we assume it's of type string.
		return 'string'
	}

	let inputType = '';
	switch (inputSchema.type) {
		case 'string':
			inputType = 'text'
			if (name === 'api_key') {
				inputType = 'password'
			}
			if (['template', 'code'].includes(name)) {
				inputType = 'textarea'
			}
			if (inputSchema.enum instanceof Array) {
				inputType = 'option'
			}
			break;
		case 'number':
		case 'integer':
		case 'boolean':
			inputType = inputSchema.type
			break;
		default:
			// null/undefined, array, object
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
//var designer = sequentialWorkflowDesigner.Designer.create(placeholder, startDefinition, await loadConfiguration());
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
		schema: getSchemaByType(step.type)
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
	const [handle] = await window.showOpenFilePicker({
		types: [{
			accept: {
				"application/json": [".json"]
			}
		}],
		excludeAcceptAllOption: true
	});
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

	designer = sequentialWorkflowDesigner.Designer.create(placeholder, definition, await loadConfiguration());

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
		if (getInputType(getSchemaByType(def.type), name) === 'json' && def.input[name] !== '') {
			// JSON string => JSON object
			console.log('name', name, 'value', value)
			def.input[name] = JSON.parse(value);
		}
	}

	def = wrapCallTask(def)

	return def;
}

function wrapCallTask(t) {
	const namespace = getFlowNamespaceByType(t.type)
	if (namespace === '') {
		return t
	}

	return {
		type: 'call',
		name: t.name,
		input: {
			loader: namespace,
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

	// Upsert tool if required.
	const group = 'Tools'
	const flowName = workflowName.toLowerCase()
	if (workflowAsTool) {
		await fetch('/api/tools/' + group, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({typ: flowName, tool: {type: flowName, name: titleCase(flowName)}})
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
			});
	} else {
		await fetch('/api/tools/' + group, {
			method: 'DELETE',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({typ: flowName})
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
			});
	}

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
