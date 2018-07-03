import getMuiTheme from 'material-ui/styles/getMuiTheme';


const blueLight = '#6BBBE6';
const blueMedium = '#55ACDB';
const blueDark = '#446577';
const lightGray = '#EEF3F5';

const BasicTheme = getMuiTheme({
    fontFamily: "'Open Sans', serif",
    palette: {
        primary1Color: blueLight,
    },
    appBar: {
        color: blueDark,
    },
    toolbar: {
        backgroundColor: lightGray,
    }
});


export default BasicTheme;