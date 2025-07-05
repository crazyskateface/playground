#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {

    /**
     * Test this out
     * echo -e "test-project\nA test project to verify the generator\n1" | node scripts/create-project.js
     */

    console.log('🚀 JavaScript Playground - Project Generator\n');

    try {
        // Get project name from user
        const projectName = await rl.question('Enter project name (kebab-case, e.g., "my-new-project"): ');
        
        if (!projectName || !isValidProjectName(projectName)) {
            console.error('❌ Invalid project name. Use kebab-case (lowercase with hyphens)');
            process.exit(1);
        }

        // Get project description
        const description = await rl.question('Enter project description: ');

        // Get project type
        console.log('\nSelect project type:');
        console.log('1. Web Component (Custom Element)');
        console.log('2. JavaScript Library/Utility');
        console.log('3. Algorithm/Data Structure');
        console.log('4. API/Network Tool');
        console.log('5. Game/Interactive Demo');
        
        const typeChoice = await rl.question('Choose type (1-5): ');
        const projectType = getProjectType(typeChoice);

        console.log(`\n🔄 Creating project "${projectName}"...`);

        // Create project structure
        await createProjectStructure(projectName, description, projectType);
        
        // Update package.json
        await updatePackageJson(projectName);
        
        // Update root vite.config.js
        await updateViteConfig(projectName);

        console.log(`\n✅ Project "${projectName}" created successfully!`);
        console.log(`\n📁 Created files:`);
        console.log(`   src/${projectName}/`);
        console.log(`   ├── index.html`);
        console.log(`   ├── index.js`);
        console.log(`   ├── style.css`);
        console.log(`   └── components/`);
        console.log(`       └── ${toPascalCase(projectName)}.js`);
        console.log(`   vite.${projectName}.config.js`);
        console.log(`\n🚀 Get started:`);
        console.log(`   npm run dev:${projectName}`);
        console.log(`   npm run build:${projectName}`);

    } catch (error) {
        console.error('❌ Error creating project:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

function isValidProjectName(name) {
    // Check for kebab-case: lowercase letters, numbers, and hyphens only
    return /^[a-z0-9-]+$/.test(name) && !name.startsWith('-') && !name.endsWith('-');
}

function getProjectType(choice) {
    const types = {
        '1': 'web-component',
        '2': 'library',
        '3': 'algorithm',
        '4': 'api-tool',
        '5': 'interactive'
    };
    return types[choice] || 'library';
}

function toPascalCase(str) {
    return str
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

function toTitleCase(str) {
    return str
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function createProjectStructure(projectName, description, projectType) {
    const projectDir = path.join(rootDir, 'src', projectName);
    const componentsDir = path.join(projectDir, 'components');

    // Create directories
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(componentsDir, { recursive: true });

    // Create files based on project type
    await createIndexHtml(projectDir, projectName, description);
    await createIndexJs(projectDir, projectName, projectType);
    await createStyleCss(projectDir);
    await createMainComponent(componentsDir, projectName, projectType);
    await createViteConfig(projectName);
}

async function createIndexHtml(projectDir, projectName, description) {
    const pascalName = toPascalCase(projectName);
    const titleName = toTitleCase(projectName);
    
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleName} - JS Playground</title>
    <link rel="stylesheet" href="./style.css">
    <link rel="icon" href="data:;base64,iVBORw0KGgo=">
</head>
<body>
    <main class="playground">
        <header class="project-header">
            <h1>🚀 ${titleName}</h1>
            <p>${description || 'A custom JavaScript implementation for learning purposes'}</p>
        </header>

        <section class="demo-section">
            <h2>📋 Demo</h2>
            <div class="demo-container">
                <!-- Your component will be rendered here -->
                <${projectName.toLowerCase()}-component></${projectName.toLowerCase()}-component>
            </div>
        </section>

        <section class="controls-section">
            <h2>🎮 Controls</h2>
            <div class="controls">
                <button id="demo-btn">Run Demo</button>
                <button id="reset-btn">Reset</button>
                <button id="toggle-debug">Toggle Debug</button>
            </div>
            
            <div class="output" id="output">
                <h3>Output:</h3>
                <pre id="output-content">Ready...</pre>
            </div>
        </section>

        <section class="info-section">
            <h2>📖 About</h2>
            <p>This project demonstrates ${description?.toLowerCase() || 'custom JavaScript functionality'} built from scratch for educational purposes.</p>
            
            <h3>🎯 Learning Goals:</h3>
            <ul>
                <li>Understanding core JavaScript concepts</li>
                <li>Implementing complex algorithms/patterns</li>
                <li>Building reusable components</li>
                <li>Performance optimization techniques</li>
            </ul>
        </section>
    </main>

    <script type="module" src="./index.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(projectDir, 'index.html'), content);
}

async function createIndexJs(projectDir, projectName, projectType) {
    const pascalName = toPascalCase(projectName);
    
    const content = `import './components/${pascalName}.js';
import './style.css';

// Main application logic
class ${pascalName}App {
    constructor() {
        this.component = document.querySelector('${projectName.toLowerCase()}-component');
        this.outputElement = document.getElementById('output-content');
        this.isDebugMode = false;
        
        this.initializeEventListeners();
        this.log('Application initialized');
    }
    
    initializeEventListeners() {
        const demoBtn = document.getElementById('demo-btn');
        const resetBtn = document.getElementById('reset-btn');
        const debugBtn = document.getElementById('toggle-debug');
        
        demoBtn?.addEventListener('click', () => this.runDemo());
        resetBtn?.addEventListener('click', () => this.reset());
        debugBtn?.addEventListener('click', () => this.toggleDebug());
        
        // Listen to custom events from your component
        this.component?.addEventListener('${projectName}-event', (e) => {
            this.log(\`Component event: \${JSON.stringify(e.detail)}\`);
        });
    }
    
    async runDemo() {
        this.log('Running demo...');
        
        try {
            // TODO: Implement your demo logic here
            if (this.component && typeof this.component.runDemo === 'function') {
                await this.component.runDemo();
            } else {
                this.log('Demo functionality not implemented yet');
            }
            
            this.log('Demo completed successfully');
        } catch (error) {
            this.log(\`Demo error: \${error.message}\`, 'error');
        }
    }
    
    reset() {
        this.log('Resetting...');
        
        if (this.component && typeof this.component.reset === 'function') {
            this.component.reset();
        }
        
        this.outputElement.textContent = 'Reset complete';
    }
    
    toggleDebug() {
        this.isDebugMode = !this.isDebugMode;
        document.body.classList.toggle('debug-mode', this.isDebugMode);
        this.log(\`Debug mode: \${this.isDebugMode ? 'ON' : 'OFF'}\`);
        
        if (this.component) {
            this.component.debugMode = this.isDebugMode;
        }
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = \`[\${timestamp}] \${message}\`;
        
        console.log(logMessage);
        
        if (this.outputElement) {
            const currentContent = this.outputElement.textContent;
            this.outputElement.textContent = currentContent + '\\n' + logMessage;
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.${projectName.replace(/-/g, '')}App = new ${pascalName}App();
});

console.log('🚀 ${pascalName} application loaded');`;

    await fs.writeFile(path.join(projectDir, 'index.js'), content);
}

async function createStyleCss(projectDir) {
    const content = `/* Project-specific styles */
:root {
    --primary-color: #007acc;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f5f5f5;
    line-height: 1.6;
    color: #333;
}

.playground {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    gap: 20px;
}

.project-header {
    text-align: center;
    padding: 30px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.project-header h1 {
    margin: 0 0 10px 0;
    color: var(--primary-color);
}

.project-header p {
    margin: 0;
    color: #666;
    font-size: 16px;
}

.demo-section,
.controls-section,
.info-section {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.demo-section h2,
.controls-section h2,
.info-section h2 {
    margin-top: 0;
    color: var(--dark-color);
    border-bottom: 2px solid var(--light-color);
    padding-bottom: 10px;
}

.demo-container {
    min-height: 200px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
}

.controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
}

button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

#demo-btn {
    background: var(--primary-color);
    color: white;
}

#demo-btn:hover {
    background: #005a99;
}

#reset-btn {
    background: var(--secondary-color);
    color: white;
}

#reset-btn:hover {
    background: #545b62;
}

#toggle-debug {
    background: var(--warning-color);
    color: #212529;
}

#toggle-debug:hover {
    background: #e0a800;
}

.output {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
    border: 1px solid #dee2e6;
}

.output h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: var(--dark-color);
}

#output-content {
    background: #212529;
    color: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
}

.info-section ul {
    padding-left: 20px;
}

.info-section li {
    margin-bottom: 5px;
}

/* Debug mode styles */
.debug-mode {
    filter: hue-rotate(180deg);
}

.debug-mode::before {
    content: "🔍 DEBUG MODE";
    position: fixed;
    top: 10px;
    right: 10px;
    background: var(--danger-color);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    z-index: 1000;
}

/* Responsive design */
@media (max-width: 768px) {
    body {
        padding: 10px;
    }
    
    .controls {
        flex-direction: column;
    }
    
    button {
        width: 100%;
    }
}`;

    await fs.writeFile(path.join(projectDir, 'style.css'), content);
}

async function createMainComponent(componentsDir, projectName, projectType) {
    const pascalName = toPascalCase(projectName);
    const elementName = `${projectName.toLowerCase()}-component`;
    
    const templates = {
        'web-component': createWebComponentTemplate,
        'library': createLibraryTemplate,
        'algorithm': createAlgorithmTemplate,
        'api-tool': createApiToolTemplate,
        'interactive': createInteractiveTemplate
    };
    
    const createTemplate = templates[projectType] || templates['library'];
    const content = createTemplate(pascalName, elementName);
    
    await fs.writeFile(path.join(componentsDir, `${pascalName}.js`), content);
}

function createWebComponentTemplate(pascalName, elementName) {
    return `export class ${pascalName} extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component state
        this.isInitialized = false;
        this.debugMode = false;
        
        // Bind methods
        this.runDemo = this.runDemo.bind(this);
        this.reset = this.reset.bind(this);
    }
    
    connectedCallback() {
        this.render();
        this.initialize();
    }
    
    disconnectedCallback() {
        this.cleanup();
    }
    
    render() {
        this.shadowRoot.innerHTML = \`
            <style>
                :host {
                    display: block;
                    width: 100%;
                    padding: 20px;
                    background: #fff;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                }
                
                .component-container {
                    text-align: center;
                }
                
                .status {
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 4px;
                    font-weight: bold;
                }
                
                .status.ready {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                
                .status.working {
                    background: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeaa7;
                }
                
                .status.complete {
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
            </style>
            
            <div class="component-container">
                <h3>🧩 ${pascalName} Component</h3>
                <div class="status ready" id="status">Ready to start</div>
                <div id="content">
                    <p>Your custom web component is ready!</p>
                    <p>Implement your functionality in the methods below.</p>
                </div>
            </div>
        \`;
    }
    
    initialize() {
        this.isInitialized = true;
        this.updateStatus('Component initialized', 'ready');
        this.dispatchEvent(new CustomEvent('${elementName.replace('-component', '')}-event', {
            detail: { type: 'initialized', timestamp: Date.now() }
        }));
    }
    
    async runDemo() {
        this.updateStatus('Running demo...', 'working');
        
        try {
            // TODO: Implement your demo logic here
            await this.delay(1000); // Simulate async work
            
            this.updateStatus('Demo completed successfully!', 'complete');
            
            this.dispatchEvent(new CustomEvent('${elementName.replace('-component', '')}-event', {
                detail: { type: 'demo-complete', timestamp: Date.now() }
            }));
            
        } catch (error) {
            this.updateStatus(\`Demo failed: \${error.message}\`, 'error');
            throw error;
        }
    }
    
    reset() {
        this.updateStatus('Reset complete', 'ready');
        
        this.dispatchEvent(new CustomEvent('${elementName.replace('-component', '')}-event', {
            detail: { type: 'reset', timestamp: Date.now() }
        }));
    }
    
    updateStatus(message, type = 'ready') {
        const statusElement = this.shadowRoot.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = \`status \${type}\`;
        }
        
        if (this.debugMode) {
            console.log(\`[${pascalName}] \${message}\`);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    cleanup() {
        // Clean up any resources, event listeners, etc.
        if (this.debugMode) {
            console.log('${pascalName} component cleaned up');
        }
    }
}

// Register the custom element
customElements.define('${elementName}', ${pascalName});`;
}

function createLibraryTemplate(pascalName, elementName) {
    return `export class ${pascalName} extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Library/utility state
        this.data = [];
        this.debugMode = false;
    }
    
    connectedCallback() {
        this.render();
        this.initialize();
    }
    
    render() {
        this.shadowRoot.innerHTML = \`
            <style>
                :host { display: block; padding: 20px; }
                .library-container { text-align: center; }
                .demo-area { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                button { margin: 5px; padding: 8px 16px; }
            </style>
            
            <div class="library-container">
                <h3>📚 ${pascalName} Library</h3>
                <div class="demo-area">
                    <p>Utility/Library demonstration area</p>
                    <button id="test-btn">Test Function</button>
                    <div id="result"></div>
                </div>
            </div>
        \`;
        
        this.shadowRoot.getElementById('test-btn').addEventListener('click', () => this.testFunction());
    }
    
    initialize() {
        // Initialize your library/utility
        console.log('${pascalName} library initialized');
    }
    
    async runDemo() {
        // Demonstrate library functionality
        this.testFunction();
    }
    
    testFunction() {
        // TODO: Implement your utility functions
        const result = this.exampleFunction([1, 2, 3, 4, 5]);
        this.shadowRoot.getElementById('result').textContent = \`Result: \${JSON.stringify(result)}\`;
    }
    
    exampleFunction(input) {
        // Example utility function - replace with your implementation
        return input.map(x => x * 2);
    }
    
    reset() {
        this.data = [];
        this.shadowRoot.getElementById('result').textContent = '';
    }
}

customElements.define('${elementName}', ${pascalName});`;
}

function createAlgorithmTemplate(pascalName, elementName) {
    return `export class ${pascalName} extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Algorithm state
        this.inputData = [];
        this.steps = [];
        this.currentStep = 0;
        this.debugMode = false;
    }
    
    connectedCallback() {
        this.render();
        this.initialize();
    }
    
    render() {
        this.shadowRoot.innerHTML = \`
            <style>
                :host { display: block; padding: 20px; }
                .algorithm-container { text-align: center; }
                .visualization { margin: 20px 0; padding: 20px; background: #f0f0f0; border-radius: 8px; min-height: 200px; }
                .controls { margin: 10px 0; }
                .step-info { margin: 10px 0; font-family: monospace; }
            </style>
            
            <div class="algorithm-container">
                <h3>🧮 ${pascalName} Algorithm</h3>
                <div class="controls">
                    <button id="generate-btn">Generate Data</button>
                    <button id="step-btn">Step</button>
                    <button id="run-btn">Run All</button>
                </div>
                <div class="step-info" id="step-info">Ready</div>
                <div class="visualization" id="visualization">
                    <p>Algorithm visualization area</p>
                </div>
            </div>
        \`;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.shadowRoot.getElementById('generate-btn').addEventListener('click', () => this.generateData());
        this.shadowRoot.getElementById('step-btn').addEventListener('click', () => this.executeStep());
        this.shadowRoot.getElementById('run-btn').addEventListener('click', () => this.runDemo());
    }
    
    initialize() {
        this.generateData();
    }
    
    generateData() {
        // Generate random data for algorithm demonstration
        this.inputData = Array.from({length: 10}, () => Math.floor(Math.random() * 100));
        this.steps = [];
        this.currentStep = 0;
        this.updateVisualization();
        this.updateStepInfo('Data generated');
    }
    
    async runDemo() {
        this.updateStepInfo('Running algorithm...');
        
        // TODO: Implement your algorithm here
        // Example: sorting algorithm
        const result = await this.exampleAlgorithm(this.inputData.slice());
        
        this.updateVisualization(result);
        this.updateStepInfo('Algorithm completed');
    }
    
    async exampleAlgorithm(data) {
        // Example algorithm - replace with your implementation
        // Simple bubble sort for demonstration
        const arr = data.slice();
        const n = arr.length;
        
        for (let i = 0; i < n - 1; i++) {
            for (let j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                    this.steps.push(\`Swapped \${arr[j+1]} and \${arr[j]}\`);
                }
            }
        }
        
        return arr;
    }
    
    executeStep() {
        if (this.currentStep < this.steps.length) {
            this.updateStepInfo(\`Step \${this.currentStep + 1}: \${this.steps[this.currentStep]}\`);
            this.currentStep++;
        } else {
            this.updateStepInfo('All steps completed');
        }
    }
    
    updateVisualization(data = this.inputData) {
        const viz = this.shadowRoot.getElementById('visualization');
        viz.innerHTML = \`
            <div style="display: flex; gap: 5px; justify-content: center; align-items: end;">
                \${data.map(val => \`
                    <div style="background: #007acc; color: white; padding: 5px; height: \${val}px; width: 30px; display: flex; align-items: end; justify-content: center; font-size: 12px;">
                        \${val}
                    </div>
                \`).join('')}
            </div>
        \`;
    }
    
    updateStepInfo(message) {
        this.shadowRoot.getElementById('step-info').textContent = message;
    }
    
    reset() {
        this.generateData();
    }
}

customElements.define('${elementName}', ${pascalName});`;
}

function createApiToolTemplate(pascalName, elementName) {
    return `export class ${pascalName} extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // API tool state
        this.apiUrl = '';
        this.requestCount = 0;
        this.debugMode = false;
    }
    
    connectedCallback() {
        this.render();
        this.initialize();
    }
    
    render() {
        this.shadowRoot.innerHTML = \`
            <style>
                :host { display: block; padding: 20px; }
                .api-container { text-align: center; }
                .request-section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
                .response-section { margin: 20px 0; padding: 15px; background: #f0f8ff; border-radius: 8px; }
                input, select { margin: 5px; padding: 8px; width: 200px; }
                .response-content { background: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; text-align: left; max-height: 300px; overflow-y: auto; }
            </style>
            
            <div class="api-container">
                <h3>🌐 ${pascalName} API Tool</h3>
                
                <div class="request-section">
                    <h4>Request Configuration</h4>
                    <div>
                        <input type="url" id="url-input" placeholder="Enter API URL" value="https://jsonplaceholder.typicode.com/posts/1">
                    </div>
                    <div>
                        <select id="method-select">
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                    <div>
                        <button id="send-btn">Send Request</button>
                        <button id="clear-btn">Clear</button>
                    </div>
                </div>
                
                <div class="response-section">
                    <h4>Response (Requests: <span id="count">0</span>)</h4>
                    <div class="response-content" id="response-content">No requests sent yet</div>
                </div>
            </div>
        \`;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.shadowRoot.getElementById('send-btn').addEventListener('click', () => this.sendRequest());
        this.shadowRoot.getElementById('clear-btn').addEventListener('click', () => this.clearResponse());
    }
    
    initialize() {
        this.updateRequestCount();
    }
    
    async runDemo() {
        // Demo with default URL
        await this.sendRequest();
    }
    
    async sendRequest() {
        const url = this.shadowRoot.getElementById('url-input').value;
        const method = this.shadowRoot.getElementById('method-select').value;
        
        if (!url) {
            this.updateResponse('Please enter a URL', 'error');
            return;
        }
        
        this.updateResponse('Sending request...', 'loading');
        
        try {
            const response = await this.makeRequest(url, method);
            this.requestCount++;
            this.updateRequestCount();
            this.updateResponse(response, 'success');
        } catch (error) {
            this.updateResponse(\`Error: \${error.message}\`, 'error');
        }
    }
    
    async makeRequest(url, method = 'GET') {
        // TODO: Implement your custom API logic here
        // This is a basic fetch wrapper - extend as needed
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        // Add request body for POST/PUT requests
        if (method === 'POST' || method === 'PUT') {
            options.body = JSON.stringify({
                title: 'Test Post',
                body: 'This is a test request from ${pascalName}',
                userId: 1
            });
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const data = await response.json();
        
        return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: data
        };
    }
    
    updateResponse(content, type = 'info') {
        const responseEl = this.shadowRoot.getElementById('response-content');
        
        if (typeof content === 'object') {
            responseEl.textContent = JSON.stringify(content, null, 2);
        } else {
            responseEl.textContent = content;
        }
        
        // Style based on response type
        responseEl.style.color = type === 'error' ? '#dc3545' : 
                                 type === 'success' ? '#28a745' : 
                                 type === 'loading' ? '#ffc107' : '#333';
    }
    
    updateRequestCount() {
        this.shadowRoot.getElementById('count').textContent = this.requestCount;
    }
    
    clearResponse() {
        this.updateResponse('Response cleared');
    }
    
    reset() {
        this.requestCount = 0;
        this.updateRequestCount();
        this.clearResponse();
    }
}

customElements.define('${elementName}', ${pascalName});`;
}

function createInteractiveTemplate(pascalName, elementName) {
    return `export class ${pascalName} extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Interactive state
        this.gameState = 'ready';
        this.score = 0;
        this.level = 1;
        this.debugMode = false;
        
        // Animation
        this.animationId = null;
        this.lastTime = 0;
    }
    
    connectedCallback() {
        this.render();
        this.initialize();
    }
    
    disconnectedCallback() {
        this.cleanup();
    }
    
    render() {
        this.shadowRoot.innerHTML = \`
            <style>
                :host { display: block; padding: 20px; }
                .game-container { text-align: center; max-width: 600px; margin: 0 auto; }
                .game-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .game-area { width: 500px; height: 300px; background: #f0f0f0; border: 2px solid #333; border-radius: 8px; margin: 0 auto; position: relative; overflow: hidden; }
                .controls { margin-top: 20px; }
                .game-object { position: absolute; border-radius: 50%; transition: all 0.1s; }
                .player { background: #007acc; }
                .enemy { background: #dc3545; }
                .collectible { background: #28a745; }
            </style>
            
            <div class="game-container">
                <h3>🎮 ${pascalName} Interactive</h3>
                
                <div class="game-info">
                    <div>Score: <span id="score">0</span></div>
                    <div>Level: <span id="level">1</span></div>
                    <div>Status: <span id="status">Ready</span></div>
                </div>
                
                <div class="game-area" id="game-area">
                    <div class="game-object player" id="player" style="width: 30px; height: 30px; left: 235px; top: 135px;"></div>
                </div>
                
                <div class="controls">
                    <button id="start-btn">Start Game</button>
                    <button id="pause-btn" disabled>Pause</button>
                    <button id="reset-btn">Reset</button>
                </div>
                
                <div style="margin-top: 15px; font-size: 12px; color: #666;">
                    Use WASD or Arrow Keys to move
                </div>
            </div>
        \`;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Button controls
        this.shadowRoot.getElementById('start-btn').addEventListener('click', () => this.startGame());
        this.shadowRoot.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
        this.shadowRoot.getElementById('reset-btn').addEventListener('click', () => this.reset());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Mouse controls (optional)
        const gameArea = this.shadowRoot.getElementById('game-area');
        gameArea.addEventListener('click', (e) => this.handleClick(e));
    }
    
    initialize() {
        this.updateDisplay();
    }
    
    startGame() {
        if (this.gameState === 'ready' || this.gameState === 'paused') {
            this.gameState = 'playing';
            this.shadowRoot.getElementById('start-btn').disabled = true;
            this.shadowRoot.getElementById('pause-btn').disabled = false;
            this.animate();
            this.updateStatus('Playing');
        }
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.shadowRoot.getElementById('start-btn').disabled = false;
            this.shadowRoot.getElementById('pause-btn').disabled = true;
            this.updateStatus('Paused');
        }
    }
    
    async runDemo() {
        // Auto-demo mode
        this.reset();
        await this.delay(500);
        this.startGame();
        
        // Simulate some gameplay
        setTimeout(() => {
            this.score += 100;
            this.updateDisplay();
        }, 1000);
    }
    
    handleKeyDown(event) {
        if (this.gameState !== 'playing') return;
        
        const player = this.shadowRoot.getElementById('player');
        const gameArea = this.shadowRoot.getElementById('game-area');
        const rect = player.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();
        
        let newX = parseInt(player.style.left) || 235;
        let newY = parseInt(player.style.top) || 135;
        
        const speed = 10;
        
        switch(event.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                newY = Math.max(0, newY - speed);
                break;
            case 's':
            case 'arrowdown':
                newY = Math.min(270, newY + speed); // 300 - 30 (player height)
                break;
            case 'a':
            case 'arrowleft':
                newX = Math.max(0, newX - speed);
                break;
            case 'd':
            case 'arrowright':
                newX = Math.min(470, newX + speed); // 500 - 30 (player width)
                break;
        }
        
        player.style.left = newX + 'px';
        player.style.top = newY + 'px';
        
        // Prevent default scrolling
        if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
    }
    
    handleClick(event) {
        if (this.gameState !== 'playing') return;
        
        // TODO: Implement click interactions
        this.score += 10;
        this.updateDisplay();
    }
    
    animate(currentTime = 0) {
        if (this.gameState !== 'playing') return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // TODO: Implement game logic here
        // Update game objects, check collisions, etc.
        
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
    
    updateDisplay() {
        this.shadowRoot.getElementById('score').textContent = this.score;
        this.shadowRoot.getElementById('level').textContent = this.level;
    }
    
    updateStatus(status) {
        this.shadowRoot.getElementById('status').textContent = status;
    }
    
    reset() {
        this.gameState = 'ready';
        this.score = 0;
        this.level = 1;
        
        // Reset player position
        const player = this.shadowRoot.getElementById('player');
        player.style.left = '235px';
        player.style.top = '135px';
        
        // Reset buttons
        this.shadowRoot.getElementById('start-btn').disabled = false;
        this.shadowRoot.getElementById('pause-btn').disabled = true;
        
        this.updateDisplay();
        this.updateStatus('Ready');
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

customElements.define('${elementName}', ${pascalName});`;
}

async function createViteConfig(projectName) {
    const content = `import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src/${projectName}',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/${projectName}',
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        '${projectName}': resolve(__dirname, 'src/${projectName}/index.html')
      }
    }
  },
  server: {
    port: ${3000 + Math.floor(Math.random() * 100)}, // Random port to avoid conflicts
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
});`;

    await fs.writeFile(path.join(rootDir, `vite.${projectName}.config.js`), content);
}

async function updateViteConfig(projectName) {
    const viteConfigPath = path.join(rootDir, 'vite.config.js');
    
    try {
        const content = await fs.readFile(viteConfigPath, 'utf8');
        
        // Find the input object in the rollupOptions
        const inputRegex = /input:\s*{([^}]*)}/s;
        const match = content.match(inputRegex);
        
        if (match) {
            const currentInput = match[1];
            
            // Check if the project already exists
            if (currentInput.includes(`'${projectName}':`)) {
                console.log(`⚠️ Project "${projectName}" already exists in vite.config.js`);
                return;
            }
            
            // Add the new project entry
            const newEntry = `            '${projectName}': resolve(__dirname, 'src/${projectName}/index.html'),`;
            const updatedInput = currentInput.trim() + '\n' + newEntry;
            
            const updatedContent = content.replace(
                inputRegex,
                `input: {
${updatedInput}
        }`
            );
            
            await fs.writeFile(viteConfigPath, updatedContent);
            console.log(`✅ Added "${projectName}" to vite.config.js`);
        } else {
            console.warn('⚠️ Could not find input configuration in vite.config.js. You may need to add it manually.');
        }
    } catch (error) {
        console.warn('⚠️ Could not update vite.config.js. You may need to add the entry manually:', error.message);
    }
}

async function updatePackageJson(projectName) {
    const packageJsonPath = path.join(rootDir, 'package.json');
    
    try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        // Add scripts for the new project
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts[`dev:${projectName}`] = `vite --config vite.${projectName}.config.js`;
        packageJson.scripts[`build:${projectName}`] = `vite build --config vite.${projectName}.config.js`;
        packageJson.scripts[`preview:${projectName}`] = `vite preview --config vite.${projectName}.config.js`;
        
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
        console.warn('⚠️ Could not update package.json. You may need to add scripts manually.');
    }
}

// Run the script
main().catch(console.error);
