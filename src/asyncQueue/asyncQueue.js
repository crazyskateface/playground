class Queue {
    constructor() { this._items = []; }
    enqueue(item) { this._items.push(item); }
    dequeue() { return this._items.shift(); }
    get size() { return this._items.length; }
}

class AsyncQueue extends Queue {
    constructor() {
        super();
        this.isProcessing = false;
    }

    enqueue(asyncTask) {
        super.enqueue(asyncTask);
        if (!this.isProcessing) {
            this.dequeue();
        }
    }

    async dequeue() {
        this.isProcessing = true;
        while (this._items.length > 0) {
            const asyncTask = super.dequeue();
            try {
                await asyncTask();
            } catch (error) {
                console.error('Error executing async task:', error);
            }
        }
        this.isProcessing = false;
    }
}

// Example usage
function asyncTask1() {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Async Task 1 completed');
        resolve();
      }, 1000);
    });
}
function asyncTask2() {
    return new Promise((resolve) => {
        setTimeout(() => {
        console.log('Async Task 2 completed');
        resolve();
        }, 500);
    });
}
function asyncTask3() {
    return new Promise((resolve) => {
        setTimeout(() => {
        console.log('Async Task 3 completed');
        resolve();
        }, 2000);
    });
}

const asyncQueue = new AsyncQueue();
asyncQueue.enqueue(asyncTask1);
asyncQueue.enqueue(asyncTask2);
asyncQueue.enqueue(asyncTask3);









// let tooltip = null;

// function addTooltip(e) {
//     if (tooltip) {
//         clearTooltip()
//     }
    
//     console.log(e)
//     let mouseX = e.pageX - 60;
//     let mouseY = e.pageY - 40;
//     console.log("page x and y ", mouseX, mouseY);

//     tooltip = document.createElement('div',)
//     tooltip.classList.add('tooltip')
//     tooltip.innerHTML = "Bro what"
//     tooltip.style.left = mouseX.toString() + 'px';
//     tooltip.style.top = mouseY.toString() + 'px';

//     e.target.parentElement.appendChild(tooltip)
//     // setTimeout(clearTooltip, 1000);
// }

// function clearTooltip() {
//     tooltip.parentElement.removeChild(tooltip)
//     tooltip = null
// }