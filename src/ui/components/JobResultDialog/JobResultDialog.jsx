// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Document, Page } from 'react-pdf/dist/entry.webpack';
// Material-UI Components
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import Paper from 'material-ui/Paper';
import Dialog from 'material-ui/Dialog';
import NavigationRefresh from 'material-ui/svg-icons/navigation/refresh';
// Icons
import SaveIcon from 'material-ui/svg-icons/content/save';
import CloseIcon from 'material-ui/svg-icons/content/clear';
// Components
import Collapsible from '../Shared/Collapsible/Collapsible';
// API
import { Canis } from 'valis';

import axios from 'axios';

class JobResultDialog extends React.Component {
  state = {
    fileList: [],
    fileBlobs: {},
  }

  componentDidMount() {
    const jobId = this.props.job.id;
    // load list of files from this job
    Canis.Api.getFiles(jobId).then(fileList => {
      this.setState({
        fileList: fileList,
      });
      fileList.map(file => {
        if (file.name.split('.').pop() === 'pdf') {
          const { fileBlobs } = this.state;
          // download pdf data
          Canis.Api.getFileBlob(file.uri).then(blob => {
            fileBlobs[file.name] = blob;
            this.setState({ fileBlobs });
          })
        }
      })
    })
  }

  renderFileCard(file) {
    let pdfNode = null;
    if (file.name.split('.').pop() === 'pdf') {
      const { fileBlobs } = this.state;
      if (fileBlobs[file.name]) {
        const blob = fileBlobs[file.name];
        // render the pdf node
        pdfNode = <div>
          <Document
            file={window.URL.createObjectURL(blob)}
          >
            <Page pageNumber={1} />
          </Document>
        </div>
      }
    }
    // render the pdf node
    return <Paper key={file.name} style={{margin: 5}}>
      <div style={{display: 'flex'}} >
        <div style={{marginTop: 'auto', marginBottom: 'auto'}} >
          {file.name}
        </div>
        <FileDownloadButton fileObj={file}/>
      </div>
      {pdfNode}
    </Paper>
  }

  render() {
    const dialogContentStyle = {
      width: '80%',
      height: '700px',
      maxWidth: 'none',
    };
    const titleNode = <div style={{display: 'flex'}} >
      <div style={{width: '70%', marginTop: 'auto', marginBottom: 'auto'}} >
        {this.props.job.name}
      </div>
      <div style={{width: '30%'}} >
        <IconButton style={{float: 'right'}}>
          <CloseIcon onClick={this.props.handleClose} />
        </IconButton>
      </div>
    </div>
    return (
      <Dialog
        open={this.props.open}
        title={titleNode}
        autoScrollBodyContent={true}
        repositionOnUpdate={false}
        contentStyle={dialogContentStyle}
      >
        {this.state.fileList.map(file => {
          return this.renderFileCard(file);
        })}
      </Dialog>
    );
  }
}

JobResultDialog.propTypes = {
  job: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};

function FileDownloadButton(props) {
  function clickDownload() {
    Canis.Api.getFileBlob(props.fileObj.uri).then(blob => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = props.fileObj.name;
      link.click();
    })
  }
  const styles = {
    smallIcon: {
      width: 24,
      height: 24,
    },
    small: {
      width: 36,
      height: 36,
      padding: 0,
    }
  }
  return (
    <IconButton iconStyle={styles.smallIcon} style={styles.small}>
      <SaveIcon onClick={clickDownload}/>
    </IconButton>
  )
}

FileDownloadButton.propTypes = {
  fileObj: PropTypes.object.isRequired,
}

export default JobResultDialog;
