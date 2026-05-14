import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ImageBackground, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const PRUTHVI_WIDE = require('../../pruthvi_wide.png');

const FloatingObject = ({ name, size, color, delay, duration, startPos }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: duration * 4,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[
      styles.floatingObject, 
      { 
        left: startPos.x, 
        top: startPos.y, 
        transform: [{ translateY }, { rotate: spin }] 
      }
    ]}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </Animated.View>
  );
};

export const BackgroundShapes = ({ isDarkMode, isLoginScreen = false }) => {
  if (isLoginScreen) {
    return (
      <View style={styles.container} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? '#051F1A' : '#E8F5EE' }]} />
        <ImageBackground 
          source={PRUTHVI_WIDE} 
          style={StyleSheet.absoluteFill}
          imageStyle={styles.image}
        >
          <LinearGradient
            colors={isDarkMode ? 
              ['rgba(5, 31, 26, 0.92)', 'rgba(5, 31, 26, 0.65)', 'rgba(5, 31, 26, 0.92)'] : 
              ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.6)']
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={isDarkMode ? ['#051F1A', '#0B6B4B'] : ['#E8F5EE', '#B9E4D0']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Dynamic Floating E-Waste & Recycling Objects */}
      <FloatingObject name="laptop" size={40} color="rgba(32, 201, 151, 0.2)" duration={3000} startPos={{ x: width * 0.1, y: height * 0.2 }} />
      <FloatingObject name="cellphone" size={30} color="rgba(32, 201, 151, 0.2)" duration={4000} startPos={{ x: width * 0.8, y: height * 0.15 }} />
      <FloatingObject name="recycle" size={50} color="rgba(32, 201, 151, 0.15)" duration={5000} startPos={{ x: width * 0.5, y: height * 0.7 }} />
      <FloatingObject name="leaf" size={24} color="rgba(32, 201, 151, 0.2)" duration={3500} startPos={{ x: width * 0.2, y: height * 0.8 }} />
      <FloatingObject name="truck-delivery" size={45} color="rgba(32, 201, 151, 0.15)" duration={6000} startPos={{ x: width * 0.85, y: height * 0.6 }} />
      <FloatingObject name="battery-positive" size={35} color="rgba(32, 201, 151, 0.2)" duration={4500} startPos={{ x: width * 0.4, y: height * 0.1 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
    width: width > 1200 ? width : '100%',
    height: '100%',
    opacity: 0.85,
  },
  floatingObject: {
    position: 'absolute',
    opacity: 0.6,
  }
});
