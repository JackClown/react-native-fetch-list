import * as React from "react";
import {
  View,
  FlatList,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  FlatListProps
} from "react-native";
import memoize from "memoize-one";

interface State<T> {
  page: number;
  data: T[];
  loading: boolean;
  refreshing: boolean;
  loadMore: number;
}

interface ListProps<T> extends Omit<FlatListProps<T>, "data"> {
  fetch: (params: { page: number; limit: number }) => Promise<T[]>;
  limit: number;
  filter?: (item: T) => boolean;
  data?: T[]; //if have this prop, List don't use state data
  onChange?: (data: T[]) => void; //like data prop
}

export default class List<T = any> extends React.PureComponent<
  ListProps<T>,
  State<T>
> {
  static defaultProps = {
    limit: 10
  };

  public state: State<T> = {
    loading: false,
    refreshing: false,
    loadMore: 2, //0 not loading more, 1 loading more, 2 can not load more
    page: 1,
    data: []
  };

  private mounted: boolean = true;

  private flatList = React.createRef<FlatList<T>>();

  private get data() {
    return this.props.data || this.state.data;
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  private getData(page: number = 1) {
    const { limit, fetch } = this.props;

    return fetch({ page, limit }).catch(err => {
      return [];
    });
  }

  private lastFetchId: number = 0;

  /**
   * @param {number} [type] loading or refreshing 0 = loading 1 = refreshing
   */
  public fetch = async (type: number = 0) => {
    this.lastFetchId += 1;

    const fetchId = this.lastFetchId;
    const key: "loading" | "refreshing" = type === 0 ? "loading" : "refreshing";

    this.setState({ [key]: true, loadMore: 0 } as any);

    const data = await this.getData(1);

    if (this.mounted === false || this.lastFetchId !== fetchId) return;

    const state: Partial<State<T>> = {
      page: 1,
      [key]: false
    };

    if (data.length < this.props.limit) {
      state.loadMore = 2;
    }

    if (this.props.onChange) {
      this.props.onChange(data);
    } else {
      state.data = data;
    }

    this.setState(state as State<T>, () => {
      if (key === "loading" && this.flatList.current) {
        this.flatList.current.scrollToOffset({
          offset: 0,
          animated: false
        });
      }
    });
  };

  private handleRefresh = () => {
    this.fetch(1);
  };

  private handleEndReached = async () => {
    if (
      this.state.loadMore !== 0 ||
      this.state.loading ||
      this.state.refreshing
    ) {
      return;
    }

    const { limit } = this.props;
    const { page } = this.state;

    this.setState({ loadMore: 1 });

    const items = await this.getData(page + 1);

    if (this.mounted === false) return;

    let currPage = page;
    let currData = this.data;

    if (items.length > 0) {
      currPage += 1;
      currData = currData.concat(items);
    }

    const state: Partial<State<T>> = {
      page: currPage,
      loadMore: 0
    };

    if (items.length < limit) {
      state.loadMore = 2;
    }

    if (this.props.onChange) {
      this.props.onChange(currData);
    } else {
      state.data = currData;
    }

    this.setState(state as State<T>);
  };

  private ListEmptyComponent = () => {
    const { loading } = this.state;
    const { ListEmptyComponent } = this.props;
    let node;

    if (React.isValidElement(ListEmptyComponent)) {
      node = ListEmptyComponent;
    } else if (typeof ListEmptyComponent === "function") {
      node = <ListEmptyComponent />;
    } else {
      node = null;
    }

    return this.lastFetchId <= 0 || loading ? null : node;
  };

  private ListFooterComponent = () => {
    const { loadMore } = this.state;
    const { ListFooterComponent } = this.props;

    let node;

    if (React.isValidElement(ListFooterComponent)) {
      node = ListFooterComponent;
    } else if (typeof ListFooterComponent === "function") {
      node = <ListFooterComponent />;
    } else {
      node = null;
    }

    return loadMore === 1 ? (
      <ActivityIndicator color="#666" animating={true} />
    ) : loadMore === 2 ? (
      node
    ) : null;
  };

  public remove(item: T) {
    this.setState((prevState: State<T>) => {
      const index = prevState.data.indexOf(item);

      if (index >= 0) {
        const data = [...prevState.data];

        data.splice(index, 1);

        return { data };
      } else {
        return null;
      }
    });
  }

  private getExtraData = memoize((...args: any[]) => args);

  private getContentStyle = memoize((...args: StyleProp<ViewStyle>[]) => args);

  public render() {
    const { loading, refreshing, loadMore } = this.state;
    const {
      filter,
      contentContainerStyle,
      extraData,
      ...restProps
    } = this.props;
    let data = this.data;

    if (filter && data) {
      data = data.filter(filter);
    }

    return (
      <View style={styles.container}>
        <FlatList
          windowSize={3}
          onEndReachedThreshold={0.1}
          ListFooterComponentStyle={styles.loadMore}
          {...restProps}
          ref={this.flatList}
          extraData={this.getExtraData(loadMore, extraData)}
          refreshing={refreshing}
          data={data}
          onRefresh={this.handleRefresh}
          onEndReached={this.handleEndReached}
          contentContainerStyle={this.getContentStyle(
            data.length > 0 ? styles.list : styles.emptyList,
            contentContainerStyle
          )}
          ListFooterComponent={this.ListFooterComponent}
          ListEmptyComponent={this.ListEmptyComponent}
        />
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color="#666" animating={true} size="large" />
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  emptyList: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 34
  },
  list: {
    paddingBottom: 34
  },
  loadMore: {
    justifyContent: "center",
    paddingVertical: 15
  },
  loading: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    paddingBottom: 34,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.3)"
  }
});
