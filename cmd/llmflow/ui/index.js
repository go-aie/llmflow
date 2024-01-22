
let workflowName = ''
let workflowDescription = ''
let workflowSchema = '{}'
let workflowResult = undefined
let workflowDefinitions = undefined
let workflowAsTool = false

let fileHandle

let currentFocusedElem

import { JSONEditor } from './svelte-jsoneditor/vanilla.js'

let allSchemas = await loadSchemas()
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
				name: tool.name,
				type: tool.type,
				properties: getEmptyPropertiesByType(tool.type)
			}
			switch (tool.type) {
				case 'decision':
					step.componentType = 'switch'
					step.branches = {
						'default': []
					}
					break
				case 'parallel':
					step.componentType = 'switch'
					step.branches = {}
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
					alert(`Can not insert the flow "${workflowName}" into itself!`)
					return false
				}
				return true
			},
			canDeleteStep: (step) => {
				// There is an issue with workflow-designer and json-editor, where if
				// the backspace key is pressed in a json-editor element, the corresponding
				// component managed by the workflow-designer will get deleted unexpectedly.
				//
				// The current patch is to check if the currently focused element is a json-editor,
				// and if it is then the corresponding component cannot be deleted.
				return !isJSONEditorElem()
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
				// 1. Name
				const labelName = document.createElement('h3')
				labelName.innerText = 'Name'
				we.appendChild(labelName)

				const input = createInputElement('text', workflowName, value => {
					workflowName = value
				})
				we.appendChild(input)

				// 2. Description
				const labelDescription = document.createElement('h3')
				labelDescription.innerText = 'Description'
				we.appendChild(labelDescription)

				const description = createInputElement('text', workflowDescription, value => {
					workflowDescription = value
				})
				we.appendChild(description)

				// 3. Schema
				const labelSchema = document.createElement('h3')
				labelSchema.innerText = 'Schema'
				we.appendChild(labelSchema)

				const schemaEditor = createJSONEditor(workflowSchema, (update) => {
					workflowSchema = update.text
					//console.log('workflowSchema', update)

					// Re-render the inputForm.
					renderForm(inputForm, JSON.parse(workflowSchema).input)
				})
				we.appendChild(schemaEditor)

				// 4. Input
				const labelInput = document.createElement('h3')
				labelInput.innerText = 'Input'
				ui.appendChild(labelInput)

				inputForm = document.createElement('div')
				ui.appendChild(inputForm)
				renderForm(inputForm, JSON.parse(workflowSchema).input)

				// 5. Output
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
		case 'parallel':
			return {
				"input": {},
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

	alert(`Found no schema for the flow "${type}"!`)

	return {
		"input": {},
		"output": {}
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
	let properties = getDefaultProperties(schema)
	for (const [name, value] of Object.entries(properties)) {
		const inputType = getInputType(schema, name)
		switch (inputType) {
			case 'number':
			case 'integer':
			case 'json':
				properties[name] = convertValue(inputType, 'string', value)
		}
	}
	return properties
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
	let {editor, container} = otherStepEditorProvider(step, editorContext);

	function createCase(lastElem, step, value) {
		const input = createInputElement('text', value, (value) => {
			//console.log('change case input from', input.oldvalue, 'to', value);

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

	const label = document.createElement('label')
	label.innerText = step.type == 'decision' ? 'cases' : 'tasks'
	label.className = 'required'
	container.appendChild(label)

	// Add cases (or tasks)
	for (const [name, _] of Object.entries(step.branches)) {
		createCase(label, step, name)
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
		//console.log('stepName', stepName, 'inputType', inputType)

		switch (inputType) {
			case 'option':
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

				break

			case 'textarea':
				const textarea = document.createElement('textarea')
				textarea.style.width = '98%'
				textarea.value = stepValue
				textarea.rows = 5
				textarea.addEventListener('input', () => {
					step.properties[stepName] = textarea.value
				})
				container.appendChild(textarea)

				break

			case 'json':
				const jsonEditor = createJSONEditor(stepValue, (update) => {
					step.properties[stepName] = update.text
				})
				container.appendChild(jsonEditor);

				break

			default:
				const inputElem = createInputElement(inputType, stepValue, (value) => {
					step.properties[stepName] = value;
					//console.log('new properties', step.properties)
				})
				container.appendChild(inputElem)
		}
	}

	return {editor, container};
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

function getDefaultProperties(schema) {
	let result = {}

	if (schema.input.properties === undefined) {
		// No schema found, return empty object.
		return result
	}

	const getValue = function(spec) {
		if (spec.default !== undefined) {
			return spec.default
		}

		if (spec.enum instanceof Array && spec.enum.length > 0) {
			return spec.enum[0]
		}

		switch (spec.type) {
			case 'string':
				return ''
			case 'number':
			case 'integer':
				return 0
			case 'boolean':
				return false
			default:
				// null/undefined, array, object
				return null
		}
	}

	for (const [name, spec] of Object.entries(schema.input.properties)) {
		result[name] = getValue(spec)
	}

	return result
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
		switch (type) {
			case 'integer':
				input.setAttribute('type', 'number')
				input.setAttribute('step', '1')
				break
			case 'number':
				input.setAttribute('type', 'number')
				input.setAttribute('step', '0.01')
				break
			default:
				input.setAttribute('type', type)
		}

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
let designer;

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

function loadFlowFromStep(step) {
	step = unWrapCallTask(step)

	let s = {
		id: sequentialWorkflowDesigner.Uid.next(),
		name: step.name,
		type: step.type,
		componentType: 'task',
		schema: getSchemaByType(step.type)
	}

	s.properties = getDefaultProperties(s.schema)
	// Overwrite default values with input values.
	for (const [name, value] of Object.entries(step.input)) {
		s.properties[name] = value
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
						steps.push(loadFlowFromStep(task));
					}
				} else {
					steps.push(loadFlowFromStep(caseTask));
				}
				s.branches[cond] = steps;
			}

			if (step.input.default) {
				let steps = [];
				if (step.input.default.type === 'serial') {
					for (let task of step.input.default.input.tasks) {
						steps.push(loadFlowFromStep(task));
					}
				} else {
					steps.push(loadFlowFromStep(step.input.default));
				}
				s.branches['default'] = steps;
			}

			break

		case 'parallel':
			s.properties = {}
			s.componentType = 'switch'
			s.branches = {}

			for (const task of step.input.tasks) {
				let steps = [];
				if (task.type === 'serial') {
					for (let subTask of task.input.tasks) {
						steps.push(loadFlowFromStep(subTask));
					}
				} else {
					// We also accept a non-serial task for maximum compatibility.
					steps.push(loadFlowFromStep(task));
				}
				s.branches[task.name] = steps;
			}

			break

		case 'loop':
			s.componentType = 'container'
			s.properties = {}
			s.sequence = []

			if (step.input.iterator) {
				let t = loadFlowFromStep(step.input.iterator);
				s.sequence.push(t);
			}

			if (step.input.body) {
				for (let task of step.input.body.input.tasks) {
					s.sequence.push(loadFlowFromStep(task));
				}
			}

			break
	}

	// Convert task types to ui types.
	for (const [name, value] of Object.entries(s.properties)) {
		const inputType = getInputType(s.schema, name)
		switch (inputType) {
			case 'number':
			case 'integer':
			case 'json':
				s.properties[name] = convertValue(inputType, 'string', value)
		}
	}

	return s
}

async function createWorkflow() {
	const handle = await window.showSaveFilePicker({
		types: [{
			accept: {
				"application/json": [".json"]
			}
		}],
		excludeAcceptAllOption: true,
		multiple: false
	})
	fileHandle = handle

	const workflow = {
		"name": "unnamed",
		"type": "serial",
		"description": "",
		"input": {
			"schema": {
				"input": {},
				"output": {}
			},
			"tasks": []
		}
	}
	await initWorkflow(workflow)
}

async function loadWorkflow() {
	workflowAsTool = false

	const [handle] = await window.showOpenFilePicker({
		types: [{
			accept: {
				"application/json": [".json"]
			}
		}],
		excludeAcceptAllOption: true
	})
	fileHandle = handle
	const file = await handle.getFile()

	let workflow = JSON.parse(await file.text())
	await initWorkflow(workflow)
}

async function initWorkflow(workflow) {
	workflowName = workflow.name
	workflowSchema = JSON.stringify(workflow.input.schema, null, 2)

	let defs = []
	for (let step of workflow.input.tasks) {
		defs.push(loadFlowFromStep(step));
	}

	workflowDescription = workflow.description
	workflowDefinitions = defs
	await initDesigner(workflowDefinitions)

	document.getElementById('save').disabled = false;
	document.getElementById('register').disabled = false;
	document.getElementById('register').innerText = workflowAsTool ? 'Unregister' : 'Register';
	//document.getElementById('run').disabled = false;
}

async function initDesigner(defs) {
	if (designer) {
		designer.destroy()
	}

	const definition = {
		sequence: defs,
		properties: {}
	}

	designer = sequentialWorkflowDesigner.Designer.create(placeholder, definition, await loadConfiguration())
}

async function saveWorkflow() {
	const data = getDefinitions()

	const bytes = JSON.stringify(data, null, 2);
	let blob = new Blob([bytes], {type: "application/json"});

	const writable = await fileHandle.createWritable();
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
		name: step.name,
		type: step.type,
		input: {}
	}

	// Copy properties from step.
	let stepProperties = {}
	for (const [name, value] of Object.entries(step.properties)) {
		stepProperties[name] = value
	}

	// Convert ui types to task types.
	for (const [name, value] of Object.entries(stepProperties)) {
		const inputType = getInputType(getSchemaByType(step.type), name)
		switch (inputType) {
			case 'number':
			case 'integer':
			case 'json':
				stepProperties[name] = convertValue('string', inputType, value)
		}
	}

	const schema = getSchemaByType(step.type)
	const required = schema.input.required !== undefined ? schema.input.required : []
	const defaultProperties = getDefaultProperties(schema)
	// Only set non-default optional values into input.
	for (const [name, value] of Object.entries(stepProperties)) {
		if (required.includes(name) || value !== defaultProperties[name]) {
			def.input[name] = value
		}
	}

	switch (step.type) {
		case 'decision':
			def.input = {
				expression: stepProperties.expression,
				cases: {}
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
							name: 'switch',
							type: 'serial',
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
							name: 'switch',
							type: 'serial',
							input: {
								tasks: tasks,
							}
						}
					}
				}
			}

			break

		case 'parallel':
			def.input = {
				tasks: []
			}

			for (const [name, steps] of Object.entries(step.branches)) {
				let tasks = [];
				for (let s of steps) {
					tasks.push(getDefFromStep(s))
				}

				// In order to save the branch name, we always create a serial task for each branch.
				def.input.tasks.push({
					name: name,
					type: 'serial',
					input: {
						tasks: tasks,
					}
				})
			}

			break

		case 'loop':
			def.input = {
				iterator: {},
				body: {
					name: 'loop',
					type: 'serial',
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

	def = wrapCallTask(def)

	return def;
}

function convertValue(fromType, toType, originalValue) {
	switch (fromType) {
		case 'string':
			switch (toType) {
				case 'string':
					return originalValue
				case 'number':
					return originalValue === '' ? 0 : parseFloat(originalValue)
				case 'integer':
					return originalValue === '' ? 0 : parseInt(originalValue)
				case 'boolean':
					return originalValue === 'true'
				default:
					// json
					return originalValue === '' ? null : JSON.parse(originalValue)
			}

		case 'number':
			switch (toType) {
				case 'string':
					return originalValue.toString()
				case 'number':
					return originalValue
				case 'integer':
					return parseInt(originalValue, 10)
				case 'boolean':
				default:
					// json
					throw new Error('unsupported')
			}

		case 'integer':
			switch (toType) {
				case 'string':
					return originalValue.toString()
				case 'integer':
				case 'number':
					return originalValue
				case 'boolean':
				default:
					// json
					throw new Error('unsupported')
			}

		case 'boolean':
			switch (toType) {
				case 'string':
					return originalValue.toString()
				case 'boolean':
					return originalValue
				case 'number':
				case 'integer':
				default:
					// json
					throw new Error('unsupported')
			}

		default:
			// json
			switch (toType) {
				case 'string':
					return originalValue === null ? '' : JSON.stringify(originalValue, null, 2)
				case 'number':
				case 'integer':
				case 'boolean':
				default:
					// json
					throw new Error('unsupported')
			}
	}
}

function wrapCallTask(t) {
	const namespace = getFlowNamespaceByType(t.type)
	if (namespace === '') {
		return t
	}

	return {
		name: t.name,
		type: 'call',
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
		name: workflowName,
		type: 'serial',
		description: workflowDescription,
		input: {
			schema: JSON.parse(workflowSchema),
			tasks: defs
		}
	}
}

async function upsertFlow() {
	const flow = getDefinitions()
	//console.log('flow', JSON.stringify(flow))

	await fetch(`/api/flows/${workflowName}`, {
		method: 'PUT',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(flow)
	})
}

async function deleteFlow() {
	await fetch(`/api/flows/${workflowName}`, {
		method: 'DELETE',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
	})
}

async function registerTool() {
	const group = 'Tools'
	const flowName = workflowName.toLowerCase()

	if (this.innerText === 'Register') {
		await upsertFlow()

		await fetch(`/api/tools/${group}`, {
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

		this.innerText = 'Unregister'

	} else {
		await deleteFlow()

		await fetch(`/api/tools/${group}`, {
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

		this.innerText = 'Register'
	}

	// Refresh schemas since some tool have been just registered/unregistered.
	allSchemas = await loadSchemas()

	// Re-init the designer.
	await initDesigner(workflowDefinitions)
}

async function runWorkflow(form) {
	await upsertFlow()

	let formData = form.formData !== undefined ? form.formData : {}

	// Test flow.
	await fetch(`/api/flows/${workflowName}:test`, {
		method: 'POST',
		headers: {
			'Accept': 'application/json, text/event-stream',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(formData)
	})
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const result = await response.json();
			//console.log(JSON.stringify(result));

			workflowResult.editor.set({
				text: JSON.stringify(result, null, 2)
			})
		});
}

async function runWorkflowInChatBot() {
	const query = document.getElementById('input-field').value;
	addMessage('user-message', query);

	const data = getDefinitions();
	//console.log('data', JSON.stringify(data));

	// Test flow.
	await fetch('/api/flows/test', {
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
			//console.log(JSON.stringify(response.json()));
		});

	// Execute flow.
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
			//console.log(JSON.stringify(result));

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

function isJSONEditorElem() {
	// Note that the class attribute is version-dependent and it might be changed in the future.
	return currentFocusedElem !== null && currentFocusedElem.className === 'cm-content cm-lineWrapping'
}

document.getElementById('create').addEventListener('click', createWorkflow);
document.getElementById('load').addEventListener('click', loadWorkflow);
document.getElementById('save').addEventListener('click', saveWorkflow);
document.getElementById('register').addEventListener('click', registerTool);
document.getElementById('submit-button').addEventListener('click', runWorkflowInChatBot);

// Note that to handle all cases correctly, we have to listen for both events 'focusin' and 'focusout'.
//
// If there is no previously focused element, clicking on a json-editor element of a component
// will only trigger a 'focusin' event. In this case, we need to update currentFocusedElem.
document.addEventListener('focusin', function(event) {
	currentFocusedElem = document.activeElement
})

// If the currently focused element is a json-editor element of a component, clicking on
// the canvas will not trigger a 'focusin' event but will trigger a 'focusout' event.
// In this case, we also need to update currentFocusedElem.
document.addEventListener('focusout', function(event) {
	currentFocusedElem = event.relatedTarget
})
