export default class InteractiveStyling {

    /**
     * Updates a supplied array with the css color from an element's style attribute
     */
    static colorFromElement(elementId: string, colorArray: Float32Array, onChange?: (colorArray: Float32Array) => void) {
        let target = document.getElementById(elementId);

        let updateColor = () => {
            let cssColor = target.style.color;
            let result = cssColor.match(/\w+\((\d+), (\d+), (\d+)(, ([\d.]+))?\)/);
            if (result == null) {
                console.warn('Could not parse css color', cssColor);
                return;
            }
            let rgb = result.slice(1, 4).map(v => parseFloat(v) / 255);
            let a = result[5] ? parseFloat(result[5]) : 1.0;
            colorArray.set(rgb);
            colorArray[3] = a;

            if (onChange != null) {
                onChange(colorArray);
            }
        }

        updateColor();

        // update on changes to the style attribute
        let observer = new MutationObserver((mutations) => mutations.forEach(updateColor));
        observer.observe(target, { attributes: true, attributeFilter: ['style'] });
    }

}