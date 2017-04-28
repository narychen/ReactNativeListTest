import React from 'react';
import {
  View,
  ListView,
  FlatList,
  CameraRoll,
  Platform,
  Dimensions,
  Image,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';

const Win = Dimensions.get(`window`);
const Psize = Win.width/3 - 8;

function groupByEveryN(array, newArray, n) {
  var result = [];
  var temp = [];
  var last = array[array.length-1];
  if (last) {
    var d = n - last.length;
    if (d > 0) {
      var a = newArray.slice(0, d);
      newArray = newArray.slice(d);
      last = last.concat(a);
      array[array.length-1] = last;
    }
  }
  for (var i = 0; i < newArray.length; ++i) {
    if (i > 0 && i % n === 0) {
      result.push(temp);
      temp = [];
    }
    temp.push(newArray[i]);
    temp.key = newArray[i].key;
  }

  if (temp.length > 0) {
    // while (temp.length !== n) {
    //   temp.push(null);
    // }
    result.push(temp);
  }

  array.push(...result);
  return array;
}

exports.MemTest = React.createClass({
  getInitialState() {
    this.loadingLock = false;
    this.lastCursor = null;
    this.assets = [];
    this.noMore = false;
    this.fetching = 0;
    return {
      testType: 'ListView',
      dataSource: new ListView.DataSource({rowHasChanged: this.rowHasChanged})
    };
  },
  rowHasChanged(r1, r2) {
    if (r1.length !== r2.length) {
      return true;
    }
    for (var i = 0; i < r1.length; i++) {
      if (r1[i] !== r2[i]) {
        return true;
      }
    }
    return false;
  },
  renderImage(image) {
    return (
      <View key={image.key} style={{flex: 1, alignItems:'center', justifyContent: 'center'}}>
        <Image style={{width: Psize, height: Psize}}
          source={{uri: image.key}}
          resizeMode={"cover"}
        />
      </View>
    );   
  },
  renderRow(images) {
    return (
      <View style={{flexDirection: 'row', paddingHorizontal:3, height: Psize + 6, justifyContent: 'flex-start'}}>
        {images.map((image)=>image ? this.renderImage(image) : null)}
      </View>
    );
  },
  renderItem({item:images}) {
    return (
      <View style={{flexDirection: 'row', paddingHorizontal:3, height: Psize + 6, justifyContent: 'flex-start'}}>
        {images.map((image)=>image ? this.renderImage(image) : null)}
      </View>
    );
  },
  componentDidMount() {
    this.fetchImages();
  },
  fetchImages() {
    if (this.loadingLock) return;
    this.loadingLock = true;
    const fetchParams = {first: 20, assetType: 'Photos', groupTypes: 'SavedPhotos'};
    if (Platform.OS==="android") {
      delete fetchParams.groupTypes;
    }
    if (this.lastCursor) {
      fetchParams.after = this.lastCursor;
    }
    var curFetchParams = fetchParams;
    CameraRoll.getPhotos(fetchParams).then(data=>{
      this.loadingLock = false;
      if (curFetchParams !== fetchParams) return;
      if (!data.page_info.has_next_page) {
        this.noMore = true;
      }
      if (data.edges.length > 0) {
        var assets = [];
        data.edges.forEach(e=>{
          if (e.node.image.height > 50 && e.node.image.width > 50) {
            assets.push({key:e.node.image.uri});
          }
        });
        this.lastCursor = data.page_info.end_cursor;
        // this.assets = this.assets.concat(assets);
        if (this.state.testType==='ListView') {
          this.setState({
            dataSource: this.state.dataSource.cloneWithRows(
              groupByEveryN(this.assets, assets, 3).slice()
            ),
          });
        } else if (this.state.testType==='FlatList') {
          this.setState({data: groupByEveryN(this.assets, assets, 3)});
        }
      }
    }).catch(err=>{
      console.error(err);
    });
  },
  renderFooterSpinner() {
    if (this.noMore || this.assets.length===0) {
      return null;
    } else {
      // this.fetchImages();
      return <ActivityIndicator />;
    }
  },
  onEndReached() {
    if (!this.noMore) {
      // console.log('fetching ... ', ++this.fetching);
      this.fetchImages();
    }
  },
  render() {
    return (
      <View style={{flex: 1, height: Win.height , justifyContent: 'center', paddingTop:10, paddingBottom:10}}>
        <TouchableOpacity style={{backgroundColor:'grey', alignSelf:'center', margin:5, paddingHorizontal:5}}
          onPress={()=>{
            this.loadingLock = false;
            this.lastCursor = null;
            this.assets = [];
            this.noMore = false;
            this.setState((prevState)=>({
              testType: prevState.testType==='FlatList' ? 'ListView' : 'FlatList'
            }), ()=>this.fetchImages());
          }}
        >
          <Text style={{color:'white'}}>{this.state.testType+': touch to switch'}</Text>
        </TouchableOpacity>
        {this.state.testType==='ListView' ? <ListView style={{height: Win.height-20}}
          ref={ref=>this.listViewRef=ref}
          renderRow={this.renderRow}
          renderFooter={this.renderFooterSpinner}
          onEndReached={this.onEndReached}
          dataSource={this.state.dataSource}
          removeClippedSubviews={true}
          onEndReachedThreshold={Win.height}
        /> : 
        <FlatList style={{height: Win.height-20}}
          ListFooterComponent={this.renderFooterSpinner}
          onEndReached={this.onEndReached}
          data={this.state.data}
          renderItem={this.renderItem}
        />}
      </View>
    );
  },
});