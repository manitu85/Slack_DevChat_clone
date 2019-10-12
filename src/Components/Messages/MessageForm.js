import React, { Component } from 'react'
import firebase from '../../firebase'
import uuidv4 from 'uuid/v4';
import { Segment, Input, Button } from 'semantic-ui-react'

import FileModal from './FileModal';
import ProggresBar from './ProggresBar';

export class MessageForm extends Component {

  state = {
    storageRef: firebase.storage().ref(),
    uploadTask: null,
    uploadState: '',
    percentUploaded: 0,
    message: '',
    errors: [],
    channel: this.props.currentChannel,
    user: this.props.currentUser,
    loadign: false,
    modal: false
  }

  openModal = ()=> this.setState({ modal: true})
  closeModal = ()=> this.setState({ modal: false})

  handleOnChange = e => {
    const { name, value } = e.target
    this.setState({ [name] : value })
  }

  createMessage = (fileUrl = null) => {
    const message = {
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      user: {
        id: this.state.user.uid,
        name: this.state.user.displayName,
        avatar: this.state.user.photoURL
      }
    };
    if (fileUrl !== null) {
      message["image"] = fileUrl;
    } else {
      message["content"] = this.state.message;
    }
    return message;
  }

  sendMessage = () => {
    const { messagesRef } = this.props
    const { message, channel } = this.state

    if (message) {
      this.setState({ loading: true })
      //send message
      messagesRef
        .child(channel.id)
        .push()
        .set(this.createMessage())
        .then(() => {
          this.setState({
            loading: false,
            message: '',
            errors: []
          })
        })
        .catch( err => {
          console.error(err)
          this.setState({
            loading: false,
            errors: [...this.state.errors, err]
          })
        }) 
    } else {
      this.setState({
        errors: [...this.state.errors,{ message: 'Add a message'}]
        // errors: this.state.errors.concat({ message: 'Add a message' }})
      })
    }
  }

  uploadFile = (file, metadata) => {
    const pathToUpload = this.state.channel.id
    const ref = this.props.messagesRef
    const filePath = `chat/public/${uuidv4().jpg}`

    this.setState({
      uploadState: 'uploading',
      uploadTask: this.state.storageRef.child(filePath).put(file, metadata)
    },
      () => {
       this.state.uploadTask.on('state_changed', snap => {
         const percentUploaded = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
         this.setState({ percentUploaded })
       },
        err => {
          console.error(err)
          this.setState({
            errors: this.state.error.concat(err),
            uploadState: 'error',
            uploadTask: null
          })
        },
         () => {
           this.state.uploadTask.snapshot.ref
             .getDownloadURL()
             .then(downloadUrl => {
               this.sendFileMessage(downloadUrl, ref, pathToUpload);
             })
             .catch(err => {
               console.error(err);
               this.setState({
                 errors: this.state.errors.concat(err),
                 uploadState: "error",
                 uploadTask: null
               });
             });
         }
       ) 
      }
    )}

  sendFileMessage = (fileUrl, ref, pathToUpload) => {
    ref
      .child(pathToUpload)
      .push()
      .set(this.createMessage(fileUrl))
      .then(() => {
        this.setState({ uploadState: "done" });
      })
      .catch(err => {
        console.error(err);
        this.setState({
          errors: this.state.errors.concat(err)
        });
      });
  };
  
  render() {
    // prettier ignore
    const { errors, message, loading, modal, uploadState, percentUploaded } = this.state
   
    return (
      <Segment className='message__form'>
        <Input
          fluid
          name='message'
          style={{ marginBottom: '.7em'}}
          label={<Button icon={'add'} />}
          labelPosition='left'
          placeholder='Write your message'
          value={message}
          onChange={this.handleOnChange}
          className={
            errors.some(err => err.message.includes('message')) ? 'error' : ''
          }
        />
        <Button.Group icon widths='2'>
          <Button 
            onClick={this.sendMessage}
            disabled={loading}
            color='orange'
            content='Add Reply'
            labelPosition='left'
            icon='edit'
          />
          <Button 
            onClick={this.openModal}
            color='teal'
            content='Upload Media'
            labelPosition='right'
            icon='cloud upload'
          />
          <FileModal
            modal={modal}
            closeModal={this.closeModal}
            uploadFile={this.uploadFile}
           />
          <ProggresBar 
            uploadState={uploadState}
            percentUploaded={percentUploaded}
          />
        </Button.Group>
      </Segment>
    )
  }
}

export default MessageForm