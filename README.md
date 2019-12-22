# React Native Fetch List

This component will manage data loading, rereshing and loading more with a fetch prop which returns a promise. You don't need to do these by youself. Rendering with Flatlist.

## Usage

### props

Other props will be spread onto `FlatList`

|Name|Type|description|
|----|-------|----------------|
|fetch|(params: { page: number; limit: number }) => Promise<T[]>|how to get data|
|limit|number, optional|data limit per page, default 10|
|data|T[], optional|if you want to manage the data by yourself, use this prop| 
|onChange|(data: T[]) => void, optional|be triggered when data change|
|filter|(item: T) => boolean, optional|method to filter some data|

### example
```javascript
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import ListView from 'react-native-fetch-list';

const App = () => {
  const keyExtractor = item => item.id;

  const request = ({ page, limit }) => {
    return fetch(
      `https://cnodejs.org/api/v1/topics?page=${page}&limit=${limit}`,
    )
      .then(res => res.json())
      .then(data => data.data);
  };

  const list = useRef();

  useEffect(() => {
    list.current.fetch();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text>{item.title}</Text>
    </View>
  );

  return (
    <ListView
      ref={list}
      fetch={request}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={<Text>no data</Text>}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#999',
  },
});

export default App;

```
