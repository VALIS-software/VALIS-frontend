import getMuiTheme from 'material-ui/styles/getMuiTheme';


const blueLight = '#02b0ec';
const blueDark = '#3a3b59';
const lightGray = '#def3fc';

const BasicTheme = getMuiTheme({
    fontFamily: '"univia-pro",sans-serif',
    palette: {
        primary1Color: blueLight,
    },
    appBar: {
        color: blueDark,
        title: {
            fontSize: 18
        }
    },
    toolbar: {
        backgroundColor: lightGray,
    }
});


export default BasicTheme;