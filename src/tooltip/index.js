
let tooltip = null;

function addTooltip(e) {
    if (tooltip) {
        clearTooltip()
    }
    
    console.log(e)
    let mouseX = e.pageX - 60;
    let mouseY = e.pageY - 40;
    console.log("page x and y ", mouseX, mouseY);

    tooltip = document.createElement('div',)
    tooltip.classList.add('tooltip')
    tooltip.innerHTML = "Bro what"
    tooltip.style.left = mouseX.toString() + 'px';
    tooltip.style.top = mouseY.toString() + 'px';

    e.target.parentElement.appendChild(tooltip)
    // setTimeout(clearTooltip, 1000);
}

function clearTooltip() {
    tooltip.parentElement.removeChild(tooltip)
    tooltip = null
}