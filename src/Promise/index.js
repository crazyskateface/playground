import { Promise } from './src/Promise/Promise.js';


function getData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Data fetched");
        }, 2000);
    });
}

let result = getData();
result.then(value => console.log(value));

// Test basic functionality
const test1 = new Promise((resolve) => {
    setTimeout(() => resolve("Async success!"), 100);
});

test1.then(value => console.log(value));

// Test error handling
const test2 = new Promise((_, reject) => {
    reject("Custom error");
});

test2.catch(error => console.log("Caught:", error));

// Test static methods
Promise.race([
    new Promise(resolve => setTimeout(() => resolve("fast"), 50)),
    new Promise(resolve => setTimeout(() => resolve("slow"), 200))
]).then(winner => console.log("Winner:", winner)); // "fast"

// Test modern utilities
const { promise, resolve } = Promise.withResolvers();
setTimeout(() => resolve("Deferred!"), 300);
promise.then(console.log);