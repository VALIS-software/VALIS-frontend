// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
// Material-UI
import RaisedButton from "material-ui/RaisedButton";
import IconButton from "material-ui/IconButton";
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';
import CircularProgress from 'material-ui/CircularProgress';
// Material-UI Icons
import CloudUpload from "material-ui/svg-icons/file/cloud-upload";
import AddCircle from "material-ui/svg-icons/content/add-circle";
import Delete from "material-ui/svg-icons/action/delete";
// Models
import App from "../../../App";
import { SiriusApi } from 'valis';
import { QueryBuilder } from 'valis'
import { FILE_TYPE_23andMe } from "../../helpers/constants";
// Styles
import './UserFilesPanel.scss';


class UserFilesPanel extends React.Component {
  state = {
    fileNames: [],
    fileTypes: [],
    fileIDs: [],
    fileNumDocs: [],
    uploadingFileNames: [],
    uploadingFileProgress: [],
    errorMsg: null,
  }



  upload23andMeFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      // check if filename already exists
      const { fileNames, uploadingFileNames, uploadingFileProgress } = this.state;
      if (fileNames.concat(uploadingFileNames).indexOf(file.name) !== -1) {
        this.setState({
          errorMsg: "File name already exists",
        })
        return;
      } else {
        this.setState({
          errorMsg: null,
        })
      }
      this.setState({
        uploadingFileNames: uploadingFileNames.concat(file.name),
        uploadingFileProgress: uploadingFileProgress.concat(0),
      });
      // function to update progress bar
      SiriusApi.uploadFile(FILE_TYPE_23andMe, file, (e) => {this.updateUploadProgress(file.name, e)}).then(() => {
        this.updateExistingFiles();
        this.removeUploadingFile(file.name);
      });
    }
  }

  updateUploadProgress = (fileName, progressEvent) => {
    const uploadingIndex = this.state.uploadingFileNames.indexOf(fileName);
    const newProgress = this.state.uploadingFileProgress.slice();
    newProgress[uploadingIndex] = progressEvent.loaded / progressEvent.total * 100;
    this.setState({
      uploadingFileProgress: newProgress,
    });
  }

  removeUploadingFile = (fileName) => {
    const uploadingFileNames = this.state.uploadingFileNames.slice();
    const uploadingProgress = this.state.uploadingFileProgress.slice();
    const uploadingIndex = this.state.uploadingFileNames.indexOf(fileName);
    uploadingFileNames.splice(uploadingIndex, 1);
    uploadingProgress.splice(uploadingIndex, 1);
    this.setState({
      uploadingFileNames: uploadingFileNames,
      uploadingProgress: uploadingProgress,
    });
  }

  updateExistingFiles = () => {
    SiriusApi.getUserFiles().then((filesInfo) => {
      const fileNames = filesInfo.map(info => {return info.fileName});
      const fileTypes = filesInfo.map(info => {return info.fileType});
      const fileIDs = filesInfo.map(info => {return info.fileID});
      const fileNumDocs = filesInfo.map(info => {return info.numDocs});
      this.setState({
        fileNames: fileNames,
        fileTypes: fileTypes,
        fileIDs: fileIDs,
        fileNumDocs: fileNumDocs,
      })
    });
  }

  componentDidMount() {
    this.updateExistingFiles();
  }

  render() {
    const uploadButton23andme = (<RaisedButton
      containerElement='label'
      label="23andMe"
      icon={<CloudUpload/>}
      primary
      >
        <input className="invisible" type="file" onChange={this.upload23andMeFile} />
    </RaisedButton>);

    const cellStyle = { padding: 5, textAlign: 'center' };

    const { fileNames, fileTypes, fileIDs, fileNumDocs, uploadingFileNames, uploadingFileProgress, errorMsg } = this.state;
    const filesTable =
      (<Table selectable={false} wrapperStyle={{ overflow: 'visible' }} bodyStyle={{ overflow: 'visible' }}>
        <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
          <TableRow>
            <TableHeaderColumn key="tools">Tools</TableHeaderColumn>
            <TableHeaderColumn key="name" colSpan="2">Name</TableHeaderColumn>
            {['Type', '#Docs'].map(t => {
              return <TableHeaderColumn key={t}>{t}</TableHeaderColumn>
            })}
          </TableRow>
        </TableHeader>
        <TableBody displayRowCheckbox={false}>
          {fileNames.map((name, index) => {
            return (
              <TableRow key={index} >
                <TableRowColumn style={{ overflow: 'visible' }}>
                  <FileOperations
                    fileName={name}
                    fileID={fileIDs[index]}
                    update={this.updateExistingFiles}
                  />
                </TableRowColumn>
                <TableRowColumn style={cellStyle} colSpan="2">{name}</TableRowColumn>
                <TableRowColumn style={cellStyle}>{fileTypes[index]}</TableRowColumn>
                <TableRowColumn style={cellStyle}>{fileNumDocs[index]}</TableRowColumn>
              </TableRow>
            );
          })}
          {uploadingFileNames.map((name, index) => {
            return (
              <TableRow key={index} >
                <TableRowColumn style={{ overflow: 'visible' }}>
                  <CircularProgress
                    mode="determinate"
                    value={uploadingFileProgress[index]}
                    size={24}
                    thickness={3}
                  />
                </TableRowColumn>
                <TableRowColumn style={cellStyle} colSpan="4">{name}</TableRowColumn>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>);

    const error = <span className='error'>{errorMsg}</span>;

    return (<div className="user-file-panel">
      {filesTable}
      <div className='buttons'>
        {uploadButton23andme}
        {error}
      </div>
    </div>);
  }
}

function FileOperations(props) {
  const styles = {
    smallIcon: {
      width: 18,
      height: 18,
      padding: 0,
    },
    small: {
      width: 20,
      height: 20,
      padding: 0,
    },
  };

  function buildFileQuery(fileID) {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.setUserFileID(fileID);
    return builder.build();
  }

  function handleClickAdd(e) {
    e.preventDefault();
    App.addVariantTrack(props.fileName, buildFileQuery(props.fileID));
  }

  function handleClickDelete(e) {
    e.preventDefault();
    SiriusApi.deleteUserFile(props.fileID).then(() => {
      props.update();
    });
  }

  const addButton =(
    <IconButton
      tooltip="Add as Track"
      onClick={handleClickAdd}
      iconStyle={styles.smallIcon}
      style={styles.small}
      tooltipPosition='top-center'
    >
      <AddCircle />
    </IconButton>
  );

  const deleteButton = (
    <IconButton
      tooltip="Delete File"
      onClick={handleClickDelete}
      iconStyle={styles.smallIcon}
      style={styles.small}
      tooltipPosition='top-center'
    >
      <Delete />
    </IconButton>
  )

  return <span>{addButton}{deleteButton}</span>;
}

export default UserFilesPanel;