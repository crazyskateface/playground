# JavaScript Learning Playground 🚀

A hands-on learning environment for understanding and re-implementing complex JavaScript systems from scratch. This playground focuses on building deep understanding by recreating fundamental JavaScript APIs and patterns.

## 📚 What's Inside

### Custom Promise Implementation
A complete, spec-compliant Promise/A+ implementation built from the ground up, featuring:

- **Core Promise mechanics** - States, transitions, and async execution
- **Full method support** - `then()`, `catch()`, `finally()` with proper chaining
- **All static methods** - `all()`, `allSettled()`, `any()`, `race()`, `resolve()`, `reject()`
- **Modern utilities** - `try()`, `withResolvers()`
- **Advanced features** - Thenable handling, recursion protection, unhandled rejection tracking

```javascript
import { Promise } from './Promise.js';

// Use just like native Promises
const promise = new Promise((resolve, reject) => {
    setTimeout(() => resolve("Custom Promise!"), 1000);
});

promise.then(value => console.log(value));

// All static methods work
Promise.all([
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3)
]).then(results => console.log(results)); // [1, 2, 3]
```

### Async Queue System
A sequential task execution system that processes async operations one at a time, featuring:

- **FIFO Queue Structure** - First-in, first-out task processing
- **Sequential Execution** - Tasks execute one after another, not concurrently
- **Error Isolation** - Failed tasks don't stop the queue from processing
- **Auto-processing** - Queue automatically starts when tasks are added
- **Inheritance Pattern** - Extends basic Queue class with async capabilities

```javascript
class AsyncQueue extends Queue {
    enqueue(asyncTask) {
        super.enqueue(asyncTask);
        if (!this.isProcessing) {
            this.dequeue(); // Auto-start processing
        }
    }
}

// Example usage
const queue = new AsyncQueue();

queue.enqueue(() => fetch('/api/data1'));
queue.enqueue(() => processData());
queue.enqueue(() => saveResults());
// Tasks execute sequentially, waiting for each to complete
```

## 🎯 Learning Goals

This playground is designed to help you understand:

- **Asynchronous JavaScript** - How promises work under the hood
- **Event loop mechanics** - Microtasks, execution timing, and scheduling
- **State machines** - Managing complex state transitions
- **API design** - Creating consistent, robust interfaces
- **Error handling** - Comprehensive error management strategies
- **Memory management** - Avoiding leaks and optimizing performance

## 🏗️ Architecture Highlights

### Promise Implementation Features

#### State Management
```javascript
// Three distinct states with proper transitions
#state = PENDING; // → FULFILLED or REJECTED (one-way only)
#value = undefined; // Stored fulfillment value
#reason = undefined; // Stored rejection reason
```

#### Handler Queues
```javascript
// Efficient callback management
#fulfillmentHandlers = []; // Called on resolve
#rejectionHandlers = []; // Called on reject
```

#### Unhandled Rejection Tracking
```javascript
// Automatic detection of unhandled rejections
#isHandled = false; // Tracks if rejection handlers are attached
```

### Async Queue Features

#### Sequential Processing
```javascript
// Ensures tasks execute one at a time
async dequeue() {
    this.isProcessing = true;
    while (this._items.length > 0) {
        const asyncTask = super.dequeue();
        await asyncTask(); // Wait for completion before next task
    }
    this.isProcessing = false;
}
```

#### Auto-start Mechanism
```javascript
// Automatically begins processing when tasks are added
enqueue(asyncTask) {
    super.enqueue(asyncTask);
    if (!this.isProcessing) {
        this.dequeue(); // Start processing if idle
    }
}
```

#### Error Isolation
```javascript
// Failed tasks don't break the queue
try {
    await asyncTask();
} catch (error) {
    console.error('Error executing async task:', error);
    // Continue processing remaining tasks
}
```

## 🧪 Testing

The implementation includes comprehensive test coverage:

```javascript
import { Promise } from './Promise.js';

// Test basic functionality
const p = new Promise(resolve => resolve('test'));
console.log(p.state); // 'pending' initially, then 'fulfilled'

// Test chaining
p.then(x => x.toUpperCase())
 .then(x => x + '!')
 .then(console.log); // 'TEST!'
```

## 🔧 Usage

### Direct Import
```javascript
import { Promise as MyPromise } from './Promise.js';

const promise = new MyPromise((resolve, reject) => {
    // Your async code here
});
```

### Shadow Global Promise
```javascript
import { Promise } from './Promise.js';

// Now all Promise usage uses your implementation
const promise = new Promise(resolve => resolve("Custom!"));
```

## 📖 Educational Value

### What You'll Learn

1. **Promise Internals**
   - How state transitions work
   - Why promises are immutable once settled
   - How thenable resolution works

2. **Async Patterns**
   - Microtask scheduling with `queueMicrotask()`
   - Handler execution timing
   - Error propagation through chains

3. **Advanced Concepts**
   - Recursion protection for cyclic references
   - Memory management in long-running chains
   - Compatibility with existing Promise ecosystem

4. **Queue-based Processing**
   - Sequential vs concurrent execution patterns
   - Task scheduling and prioritization
   - Error isolation in async workflows
   - Auto-processing and flow control

### Code Quality Features

- **Private fields** for true encapsulation
- **Robust error handling** with try/catch blocks
- **Consistent thenable detection** across all methods
- **Proper async execution** using microtasks
- **Edge case handling** (empty arrays, null values, etc.)

## 🚀 Future Additions

This playground is designed to grow. Planned implementations include:

### 🔄 Async Patterns & Control Flow
- **Async/Await** - Building async/await on top of custom Promises
- **Worker Threads** - Multi-threaded JavaScript execution patterns
- **Rate Limiting** - Request throttling and backpressure handling
- **Circuit Breakers** - Fault tolerance patterns for async operations

### 📡 Reactive Programming
- **Observables** - RxJS-style reactive programming patterns
- **Event Emitters** - Custom event system implementation
- **Pub/Sub System** - Message passing and event distribution
- **State Management** - Redux-like state containers

### 🌊 Stream Processing
- **Readable/Writable Streams** - Node.js-style streaming APIs
- **Transform Streams** - Data processing pipelines
- **Backpressure Handling** - Flow control in streaming systems
- **Stream Operators** - Map, filter, reduce for async data flows

### 🌐 Web APIs & Network
- **Custom Fetch** - HTTP client implementation
- **WebSocket Client** - Real-time communication patterns
- **Server-Sent Events** - Event streaming implementation
- **GraphQL Client** - Query-based data fetching

### 🔧 Development Tools
- **Task Runners** - Build system implementations
- **Module Bundlers** - Dependency resolution and bundling
- **Test Frameworks** - Custom testing utilities
- **Debugging Tools** - Profiling and inspection utilities

### 💾 Data Structures & Algorithms
- **LRU Cache** - Least Recently Used caching system
- **Trie Implementation** - Prefix tree for string operations
- **Graph Algorithms** - Pathfinding and traversal patterns
- **Sorting Algorithms** - Custom sorting implementations

Each implementation will follow the same principles: built from scratch, well-documented, and designed for learning rather than production use.

## 🎓 Learning Approach

Each implementation in this playground follows these principles:

1. **Start from scratch** - No dependencies on existing implementations
2. **Spec compliance** - Follow official specifications where they exist
3. **Comprehensive comments** - Explain the "why" not just the "what"
4. **Test extensively** - Verify behavior matches expected patterns
5. **Progressive complexity** - Build understanding layer by layer

## 📋 Promise API Reference

### Constructor
```javascript
new Promise(executor: (resolve, reject) => void)
```

### Instance Methods
```javascript
.then(onFulfilled?, onRejected?) // Promise chaining
.catch(onRejected)              // Error handling
.finally(onFinally)             // Cleanup operations
```

### Static Methods
```javascript
Promise.all(promises)          // Wait for all to fulfill
Promise.allSettled(promises)   // Wait for all to settle
Promise.any(promises)          // First to fulfill wins
Promise.race(promises)         // First to settle wins
Promise.resolve(value)         // Create fulfilled promise
Promise.reject(reason)         // Create rejected promise
Promise.try(fn, ...args)       // Wrap sync/async functions
Promise.withResolvers()        // External resolve/reject control
```

## 🔍 Implementation Details

### Key Features Implemented

- ✅ **Promise/A+ compliance** - Follows the official specification
- ✅ **Thenable interoperability** - Works with other Promise libraries
- ✅ **Proper error handling** - Catches synchronous throws in executors
- ✅ **Microtask scheduling** - Uses `queueMicrotask()` for proper timing
- ✅ **Recursion protection** - Prevents infinite cycles
- ✅ **Unhandled rejection tracking** - Warns about missed error handling
- ✅ **Symbol.species support** - Enables proper subclassing

### Advanced Patterns Demonstrated

1. **State Machine Design** - Clean transitions between pending/fulfilled/rejected
2. **Handler Queue Management** - Efficient callback storage and execution
3. **Async Coordination** - Complex static methods like `Promise.all()` and `Promise.any()`
4. **Error Boundary Patterns** - Comprehensive error catching and propagation
5. **Memory Management** - Proper cleanup of handlers and references

## 📝 Notes

This is a **learning project** focused on understanding JavaScript internals. While the implementations are production-quality, they're primarily educational tools for developers who want to understand how complex JavaScript systems work under the hood.

Perfect for:
- JavaScript developers wanting deeper understanding
- Interview preparation for senior roles
- Teaching and learning async JavaScript concepts
- Building custom runtime environments

## 📄 Files

- `Promise.js` - Complete Promise implementation with all methods
- `asyncQueue.js` - Sequential async task processing system
- `app.js` - Example applications and demonstrations
- `index.html` - Browser-based testing environment
- `index.js` - Entry point for various experiments

---

*"The best way to understand a system is to build it yourself."* 🛠️

## 🤝 Contributing

This is a personal learning playground, but feel free to:
- Suggest additional JavaScript systems to implement
- Point out improvements or bug fixes
- Share your own implementations for comparison
- Use this as inspiration for your own learning projects

**Remember**: The goal is understanding, not just working code! 🧠✨
