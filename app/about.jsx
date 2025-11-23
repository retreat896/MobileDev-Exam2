import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const Index = () => {
    return (
        <SafeAreaProvider style={styles.screen}>
            <SafeAreaView>
                <View style={styles.flexColumn}>
                    <Text style={styles.text}>CS3720 Mobile App Development</Text>
                    <View style={styles.flexColumn}>
                        <Text style={styles.text}>UW Platteville </Text>
                        <Image style={styles.image} source={{uri: "https://cdn.uwplatt.edu/logo/vertical/official/b_clear/1024.png"}}/>
                    </View>
                    <Text style={styles.text}>Kristopher Adams | Jacob Malland</Text>
                    <Text style={styles.text}>Professor: Dr. Abraham Aldaco</Text>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>

    )
}

export default Index;

const styles = StyleSheet.create({
    screen: {
        backgroundColor: '#000',
        flex: 1,
        paddingTop: 80, 
    },
    text: {
        fontSize: 20,
        fontFamily: 'system-ui',
        color: 'white',
    },
    image:{
        width: 200,
        height: 200,
        resizeMode: 'contain',
        margin: 10,
    },
    flexColumn: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 10,
    },
});